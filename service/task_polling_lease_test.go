package service

import (
	"testing"
	"time"
)

// The lease has to outlive a pass that runs slower than one tick, or the node
// doing the work keeps handing it to its neighbour and every pass starts over
// somewhere else.
func TestFastPollLeaseTTLOutlivesSeveralTicks(t *testing.T) {
	cases := []struct {
		interval time.Duration
		want     float64
	}{
		{500 * time.Millisecond, 5}, // the floor: four ticks would be 2s
		{1 * time.Second, 5},        // still the floor
		{3 * time.Second, 12},       // four ticks
		{30 * time.Second, 120},     // the slow-channel cadence
	}
	for _, c := range cases {
		if got := fastPollLeaseTTL(c.interval); got != c.want {
			t.Fatalf("interval %s: want %v seconds, got %v", c.interval, c.want, got)
		}
		if got := fastPollLeaseTTL(c.interval); got <= c.interval.Seconds() {
			t.Fatalf("interval %s: a lease of %v seconds expires within one tick", c.interval, got)
		}
	}
}

// The point of pollLease is how rarely it asks, so that is what is asserted:
// a holder ticking ten times a second for a minute should touch the database
// about as often as the lease is long, not about as often as it ticks.
func TestPollLeaseRenewsOnceHalfTheLeaseHasRun(t *testing.T) {
	lease := &pollLease{renewAfter: 2500 * time.Millisecond, retryAfter: time.Second}
	asked := 0
	tryHold := func() bool { asked++; return true }

	start := time.Now()
	polled := 0
	for tick := 0; tick < 600; tick++ { // 60s at a 100ms tick
		if lease.held(start.Add(time.Duration(tick)*100*time.Millisecond), tryHold) {
			polled++
		}
	}
	if polled != 600 {
		t.Fatalf("holder should poll on every tick, polled %d of 600", polled)
	}
	// 60s of ticks renewing every 2.5s: at 0s, 2.5s ... 57.5s. Twenty-four
	// writes a minute, where every tick taking the lease would be six hundred.
	if asked != 24 {
		t.Fatalf("expected 24 lease writes in 60s, got %d", asked)
	}
}

// A node that does not hold the lease must not poll, and must not ask at tick
// speed either - but must still ask often enough to take over quickly.
func TestPollLeaseStandbyBacksOffButStaysReady(t *testing.T) {
	lease := &pollLease{renewAfter: 2500 * time.Millisecond, retryAfter: time.Second}
	asked := 0
	refuse := func() bool { asked++; return false }

	start := time.Now()
	for tick := 0; tick < 600; tick++ {
		if lease.held(start.Add(time.Duration(tick)*100*time.Millisecond), refuse) {
			t.Fatal("a standby node polled")
		}
	}
	if asked != 60 { // once a second for a minute
		t.Fatalf("expected 60 retries in 60s, got %d", asked)
	}

	// And when the holder goes away, the next retry takes over - no more than
	// retryAfter later, well inside the lease.
	now := start.Add(60 * time.Second)
	if lease.held(now, func() bool { return true }) != true {
		t.Fatal("standby did not take a free lease")
	}
	if !lease.held(now.Add(100*time.Millisecond), func() bool {
		t.Fatal("took the lease again on the very next tick")
		return true
	}) {
		t.Fatal("new holder did not poll")
	}
}
