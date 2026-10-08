package openai

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A channel's model_mapping is applied to the request and not to the response,
// so without these the reply advertises the upstream's name - a name this
// gateway refuses on the next request, which clients hit by copying the model
// out of a reply and sending it back.
const (
	renameAsked    = "Public-5.3"
	renameUpstream = "vendor-org/private-5.3"
)

func newRenameInfo(mapped bool) *relaycommon.RelayInfo {
	info := &relaycommon.RelayInfo{
		ChannelMeta:     &relaycommon.ChannelMeta{UpstreamModelName: renameUpstream},
		OriginModelName: renameAsked,
		RelayFormat:     types.RelayFormatOpenAI,
	}
	info.IsModelMapped = mapped
	return info
}

func TestStreamFrameReportsTheRequestedModel(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	frame := `{"id":"x","object":"chat.completion.chunk","model":"` + renameUpstream +
		`","choices":[{"index":0,"delta":{"content":"hi"}}]}`

	t.Run("a mapped model is renamed in the frame", func(t *testing.T) {
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

		require.NoError(t, sendStreamData(c, newRenameInfo(true), frame, false, false))

		body := recorder.Body.String()
		assert.Contains(t, body, renameAsked)
		assert.NotContains(t, body, renameUpstream)
	})

	t.Run("an unmapped model is forwarded untouched", func(t *testing.T) {
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

		require.NoError(t, sendStreamData(c, newRenameInfo(false), frame, false, false))

		assert.Contains(t, recorder.Body.String(), renameUpstream)
	})

	t.Run("a frame that does not parse is still delivered", func(t *testing.T) {
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)

		require.NoError(t, sendStreamData(c, newRenameInfo(true), `{"half`, false, false))

		assert.Contains(t, recorder.Body.String(), `{"half`)
	})
}

func TestNonStreamResponseReportsTheRequestedModel(t *testing.T) {
	oldMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(oldMode) })

	upstreamBody := `{"id":"x","object":"chat.completion","model":"` + renameUpstream +
		`","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","content":"hi"}}],` +
		`"usage":{"prompt_tokens":5,"completion_tokens":1,"total_tokens":6}}`

	run := func(t *testing.T, mapped bool) string {
		t.Helper()
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", nil)
		resp := &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(upstreamBody)),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
		}

		usage, apiErr := OpenaiHandler(c, newRenameInfo(mapped), resp)
		require.Nil(t, apiErr)
		require.NotNil(t, usage)
		// The rewrite must not disturb the counts the charge is computed from.
		assert.Equal(t, 5, usage.PromptTokens)
		assert.Equal(t, 1, usage.CompletionTokens)
		return recorder.Body.String()
	}

	t.Run("a mapped model is renamed in the body", func(t *testing.T) {
		body := run(t, true)
		var parsed map[string]any
		require.NoError(t, common.Unmarshal([]byte(body), &parsed))
		assert.Equal(t, renameAsked, parsed["model"])
		// The answer itself has to survive the re-marshal.
		assert.Contains(t, body, `"content":"hi"`)
	})

	t.Run("an unmapped model is passed through", func(t *testing.T) {
		assert.Contains(t, run(t, false), renameUpstream)
	})
}
