package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A task log has always named the channel. On a multi-key channel that is the
// provider but not the account, which is not enough to reconcile a provider's
// bill per key, or to tell one failing key from its neighbours.

func logTaskConsumptionWithChannelContext(t *testing.T, info *relaycommon.RelayInfo, task *model.Task, multiKey bool, keyIndex int) *model.Log {
	t.Helper()
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/v1/videos", nil)
	ctx.Set("token_name", "test_token")
	ctx.Set("use_channel", []string{"70"})
	common.SetContextKey(ctx, constant.ContextKeyChannelIsMultiKey, multiKey)
	if multiKey {
		common.SetContextKey(ctx, constant.ContextKeyChannelMultiKeyIndex, keyIndex)
	}
	LogTaskConsumption(ctx, info, task)
	log := getLastLog(t)
	require.NotNil(t, log)
	return log
}

func taskBillingInfo(userID, channelID int) *relaycommon.RelayInfo {
	return &relaycommon.RelayInfo{
		UserId:          userID,
		OriginModelName: "MiniMax-H3-Fast",
		UsingGroup:      "default",
		ChannelMeta:     &relaycommon.ChannelMeta{ChannelId: channelID},
		TaskRelayInfo:   &relaycommon.TaskRelayInfo{Action: "GENERATE"},
		PriceData: types.PriceData{
			ModelPrice:     0.02,
			Quota:          100,
			GroupRatioInfo: types.GroupRatioInfo{GroupRatio: 1},
		},
	}
}

func adminInfoOf(t *testing.T, log *model.Log) map[string]any {
	t.Helper()
	var other map[string]any
	require.NoError(t, json.Unmarshal([]byte(log.Other), &other))
	admin, ok := other["admin_info"].(map[string]any)
	require.True(t, ok, "expected admin_info on the task log, got %v", other)
	return admin
}

func TestLogTaskConsumptionRecordsWhichKeyServed(t *testing.T) {
	truncate(t)
	const userID, channelID = 70, 70
	seedUser(t, userID, 10_000)
	seedChannel(t, channelID)

	task := makeTask(userID, channelID, 100, 0, BillingSourceWallet, 0)
	log := logTaskConsumptionWithChannelContext(t, taskBillingInfo(userID, channelID), task, true, 2)

	admin := adminInfoOf(t, log)
	assert.Equal(t, true, admin["is_multi_key"])
	assert.Equal(t, float64(2), admin["multi_key_index"])
	assert.Equal(t, []any{"70"}, admin["use_channel"])
}

func TestLogTaskConsumptionSaysNothingAboutKeysOnSingleKeyChannels(t *testing.T) {
	truncate(t)
	const userID, channelID = 71, 71
	seedUser(t, userID, 10_000)
	seedChannel(t, channelID)

	task := makeTask(userID, channelID, 100, 0, BillingSourceWallet, 0)
	log := logTaskConsumptionWithChannelContext(t, taskBillingInfo(userID, channelID), task, false, 0)

	admin := adminInfoOf(t, log)
	assert.NotContains(t, admin, "is_multi_key")
	assert.NotContains(t, admin, "multi_key_index")
}
