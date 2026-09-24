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
