package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

// A multi-key channel hands a different key to each request, and an async task
// belongs to the key that created it. These cover the two places that decide
// which key polls a task; getting them wrong strands the task rather than
// failing it, which is why they are worth pinning down.

func multiKeyChannel(keys string, statuses map[int]int) *model.Channel {
	ch := &model.Channel{Key: keys}
	ch.ChannelInfo.IsMultiKey = true
	ch.ChannelInfo.MultiKeySize = len(ch.GetKeys())
	ch.ChannelInfo.MultiKeyStatusList = statuses
	return ch
}

func TestFirstEnabledKeyNeverReturnsTheWholeList(t *testing.T) {
	ch := multiKeyChannel("alpha\nbeta\ngamma", nil)
	if got := firstEnabledKey(ch); got != "alpha" {
		t.Fatalf("want the first key, got %q", got)
	}

	disabled := multiKeyChannel("alpha\nbeta\ngamma", map[int]int{
		0: common.ChannelStatusAutoDisabled,
		1: common.ChannelStatusEnabled,
	})
	if got := firstEnabledKey(disabled); got != "beta" {
		t.Fatalf("want the first enabled key, got %q", got)
	}

	single := &model.Channel{Key: "only-one"}
	if got := firstEnabledKey(single); got != "only-one" {
		t.Fatalf("a single-key channel keeps its key, got %q", got)
	}
	if got := firstEnabledKey(nil); got != "" {
		t.Fatalf("no channel, no key, got %q", got)
	}
}

func TestBatchPollKeyPrefersTheSubmittingKey(t *testing.T) {
	ch := multiKeyChannel("alpha\nbeta", nil)
	pinned := &model.Task{}
	pinned.PrivateData.Key = "beta"
	if got := batchPollKey(ch, []*model.Task{pinned}); got != "beta" {
		t.Fatalf("want the task's own key, got %q", got)
	}
	// Nothing recorded (a task created before keys were pinned): a guess, but
	// never the concatenated list.
	if got := batchPollKey(ch, []*model.Task{{}}); got != "alpha" {
		t.Fatalf("want a single usable key, got %q", got)
	}
}

func TestGroupTaskIdsByKeySplitsAndKeepsOrder(t *testing.T) {
	taskM := map[string]*model.Task{}
	for id, key := range map[string]string{"a": "k1", "b": "k2", "c": "k1", "d": ""} {
		task := &model.Task{}
		task.PrivateData.Key = key
		taskM[id] = task
	}
	groups := groupTaskIdsByKey([]string{"a", "b", "c", "d"}, taskM)
	if len(groups) != 3 {
		t.Fatalf("want one group per key, got %d: %v", len(groups), groups)
	}
	want := [][]string{{"a", "c"}, {"b"}, {"d"}}
	for i, group := range want {
		if len(groups[i]) != len(group) {
			t.Fatalf("group %d: want %v, got %v", i, group, groups[i])
		}
		for j, id := range group {
			if groups[i][j] != id {
				t.Fatalf("group %d: want %v, got %v", i, group, groups[i])
			}
		}
	}

	// The single-key case must stay one call, exactly as before.
	plain := map[string]*model.Task{"a": {}, "b": {}}
	if groups := groupTaskIdsByKey([]string{"a", "b"}, plain); len(groups) != 1 {
		t.Fatalf("unpinned tasks poll together, got %d groups", len(groups))
	}
}

func taskRelayInfo(apiKey string, multiKey bool) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelType:       constant.ChannelTypeTaskPlugin,
			ChannelIsMultiKey: multiKey,
			ApiKey:            apiKey,
		},
	}
}

func TestInitTaskPinsTheKeyForMultiKeyChannels(t *testing.T) {
	if key := model.InitTask(constant.TaskPlatformSuno, taskRelayInfo("sk-used", true)).PrivateData.Key; key != "sk-used" {
		t.Fatalf("a multi-key channel must pin its key, got %q", key)
	}
	// A single-key channel needs no pin: its Key field is already one key, and
	// pinning would freeze a key an operator may since have replaced.
	if key := model.InitTask(constant.TaskPlatformSuno, taskRelayInfo("sk-used", false)).PrivateData.Key; key != "" {
		t.Fatalf("a single-key channel has nothing to pin, got %q", key)
	}
}
