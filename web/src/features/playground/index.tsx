/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { cn } from '@/lib/utils'

import { PlaygroundChat } from './components/chat/playground-chat'
import { PlaygroundInput } from './components/input/playground-input'
import { PlaygroundHeader } from './components/playground-header'
import {
  useChatHandler,
  usePlaygroundConversation,
  usePlaygroundOptions,
  usePlaygroundState,
} from './hooks'

export function Playground() {
  const {
    config,
    parameterEnabled,
    messages,
    isLoadingMessages,
    models,
    groups,
    updateMessages,
    setModels,
    setGroups,
    updateConfig,
    updateParameterEnabled,
    clearMessages,
  } = usePlaygroundState()

  const { sendChat, stopGeneration, isGenerating } = useChatHandler({
    config,
    parameterEnabled,
    onMessageUpdate: updateMessages,
  })

  const {
    editingMessageKey,
    handleSendMessage,
    handleRegenerateMessage,
    handleEditMessage,
    handleEditOpenChange,
    applyEdit,
    handleDeleteMessage,
  } = usePlaygroundConversation({
    messages,
    updateMessages,
    sendChat,
  })

  const handleClearMessages = () => {
    handleEditOpenChange(false)
    clearMessages()
  }

  const { isLoadingModels } = usePlaygroundOptions({
    currentGroup: config.group,
    currentModel: config.model,
    setGroups,
    setModels,
    updateConfig,
  })

  const isEmptyConversation = messages.length === 0 && !isLoadingMessages

  return (
    <div className='bg-background relative flex size-full min-h-0 flex-col overflow-hidden'>
      <PlaygroundHeader
        config={config}
        disabled={isGenerating}
        groups={groups}
        hasMessages={messages.length > 0}
        isModelLoading={isLoadingModels}
        models={models}
        onClearMessages={handleClearMessages}
        onConfigChange={updateConfig}
        onParameterEnabledChange={updateParameterEnabled}
        parameterEnabled={parameterEnabled}
      />
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          isEmptyConversation && 'justify-center'
        )}
      >
        <div
          className={cn(
            'flex min-h-0 flex-col overflow-hidden',
            !isEmptyConversation && 'flex-1'
          )}
        >
          <PlaygroundChat
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onRegenerateMessage={handleRegenerateMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onSelectPrompt={handleSendMessage}
            isGenerating={isGenerating}
            editingKey={editingMessageKey}
            onCancelEdit={handleEditOpenChange}
            onSaveEdit={(newContent) => applyEdit(newContent, false)}
            onSaveEditAndSubmit={(newContent) => applyEdit(newContent, true)}
          />
        </div>

        <div className='mx-auto w-full max-w-[52rem] shrink-0'>
          <PlaygroundInput
            disabled={isGenerating}
            groups={groups}
            isGenerating={isGenerating}
            isModelLoading={isLoadingModels}
            models={models}
            onStop={stopGeneration}
            onSubmit={handleSendMessage}
          />
        </div>
      </div>
    </div>
  )
}
