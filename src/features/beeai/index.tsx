import { useState } from 'react'
import { Fragment } from 'react/jsx-runtime'
import { format } from 'date-fns'
import {
  ArrowLeft,
  MoreVertical,
  Plus,
  Search as SearchIcon,
  Send,
  Bot,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitch } from '@/components/language-switch'
import { NewAIChat } from './components/new-ai-chat'
import { type AIAgent, type Message } from './data/beeai-types'
// Fake Data
import { conversations } from './data/conversations.json'

export function BeeAI() {
  const [search, setSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null)
  const [mobileSelectedAgent, setMobileSelectedAgent] = useState<AIAgent | null>(
    null
  )
  const [createConversationDialogOpened, setCreateConversationDialog] =
    useState(false)
  const [inputMessage, setInputMessage] = useState('')

  // Filtered data based on the search query
  const filteredAgentList = conversations.filter(({ fullName, category }) =>
    `${fullName} ${category}`.toLowerCase().includes(search.trim().toLowerCase())
  )

  const currentMessages = selectedAgent?.messages.reduce(
    (acc: Record<string, Message[]>, obj) => {
      const key = format(obj.timestamp, 'd MMM, yyyy')

      // Create an array for the category if it doesn't exist
      if (!acc[key]) {
        acc[key] = []
      }

      // Push the current object to the array
      acc[key].push(obj)

      return acc
    },
    {}
  )

  const agents = conversations.map(({ messages, ...agent }) => agent)

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !selectedAgent) return
    
    // 这里未来会连接到真实的 AI Agent API
    // 目前只是模拟发送消息
    console.log('发送消息:', inputMessage)
    setInputMessage('')
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <LanguageSwitch />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <section className='flex h-full gap-6'>
          {/* Left Side - AI Agents List */}
          <div className='flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80'>
            <div className='sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none'>
              <div className='flex items-center justify-between py-2'>
                <div className='flex gap-2'>
                  <h1 className='text-2xl font-bold'>BeeAI</h1>
                  <Sparkles size={20} className='text-primary' />
                </div>

                <Button
                  size='icon'
                  variant='ghost'
                  onClick={() => setCreateConversationDialog(true)}
                  className='rounded-lg'
                >
                  <Plus size={24} className='stroke-muted-foreground' />
                </Button>
              </div>

              <label
                className={cn(
                  'focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden',
                  'flex h-10 w-full items-center space-x-0 rounded-md border border-border ps-2'
                )}
              >
                <SearchIcon size={15} className='me-2 stroke-slate-500' />
                <span className='sr-only'>搜索 AI Agent</span>
                <input
                  type='text'
                  className='w-full flex-1 bg-inherit text-sm focus-visible:outline-hidden'
                  placeholder='搜索 AI Agent...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            <ScrollArea className='-mx-3 h-full overflow-scroll p-3'>
              {filteredAgentList.map((agent) => {
                const { id, profile, messages, fullName, category } = agent
                const lastMessage = messages[0]
                const lastMsg = lastMessage.message
                return (
                  <Fragment key={id}>
                    <button
                      type='button'
                      className={cn(
                        'group hover:bg-accent hover:text-accent-foreground',
                        `flex w-full rounded-md px-2 py-2 text-start text-sm`,
                        selectedAgent?.id === id && 'sm:bg-muted'
                      )}
                      onClick={() => {
                        setSelectedAgent(agent)
                        setMobileSelectedAgent(agent)
                      }}
                    >
                      <div className='flex gap-2'>
                        <Avatar>
                          <AvatarFallback className='text-lg'>{profile}</AvatarFallback>
                        </Avatar>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                            <span className='col-start-2 row-span-2 font-medium truncate'>
                              {fullName}
                            </span>
                            {category && (
                              <span className='text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
                                {category}
                              </span>
                            )}
                          </div>
                          <span className='col-start-2 row-span-2 row-start-2 line-clamp-2 text-ellipsis text-muted-foreground group-hover:text-accent-foreground/90 text-xs'>
                            {lastMsg.substring(0, 50)}...
                          </span>
                        </div>
                      </div>
                    </button>
                    <Separator className='my-1' />
                  </Fragment>
                )
              })}
            </ScrollArea>
          </div>

          {/* Right Side - Chat Interface */}
          {selectedAgent ? (
            <div
              className={cn(
                'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col border bg-background shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
                mobileSelectedAgent && 'start-0 flex'
              )}
            >
              {/* Top Part */}
              <div className='mb-1 flex flex-none justify-between bg-card p-4 shadow-lg sm:rounded-t-md'>
                {/* Left */}
                <div className='flex gap-3'>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='-ms-2 h-full sm:hidden'
                    onClick={() => setMobileSelectedAgent(null)}
                  >
                    <ArrowLeft className='rtl:rotate-180' />
                  </Button>
                  <div className='flex items-center gap-2 lg:gap-4'>
                    <Avatar className='size-9 lg:size-11'>
                      <AvatarFallback className='text-xl'>{selectedAgent.profile}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='col-start-2 row-span-2 text-sm font-medium lg:text-base'>
                          {selectedAgent.fullName}
                        </span>
                        {selectedAgent.category && (
                          <span className='text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
                            {selectedAgent.category}
                          </span>
                        )}
                      </div>
                      <span className='col-start-2 row-span-2 row-start-2 line-clamp-1 block max-w-32 text-xs text-nowrap text-ellipsis text-muted-foreground lg:max-w-none lg:text-sm'>
                        {selectedAgent.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className='-me-1 flex items-center gap-1 lg:gap-2'>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6'
                  >
                    <MoreVertical className='stroke-muted-foreground sm:size-5' />
                  </Button>
                </div>
              </div>

              {/* Conversation */}
              <div className='flex flex-1 flex-col gap-2 rounded-md px-4 pt-0 pb-4'>
                <div className='flex size-full flex-1'>
                  <div className='chat-text-container relative -me-4 flex flex-1 flex-col overflow-y-hidden'>
                    <div className='chat-flex flex h-40 w-full grow flex-col-reverse justify-start gap-4 overflow-y-auto py-2 pe-4 pb-4'>
                      {currentMessages &&
                        Object.keys(currentMessages).map((key) => (
                          <Fragment key={key}>
                            {currentMessages[key].map((msg, index) => (
                              <div
                                key={`${msg.sender}-${msg.timestamp}-${index}`}
                                className={cn(
                                  'chat-box max-w-[85%] px-4 py-3 wrap-break-word shadow-lg rounded-lg',
                                  msg.sender === 'You'
                                    ? 'self-end rounded-[16px_16px_0_16px] bg-primary/90 text-primary-foreground'
                                    : 'self-start rounded-[16px_16px_16px_0] bg-muted'
                                )}
                              >
                                {msg.sender === 'BeeAI' && (
                                  <div className='flex items-center gap-2 mb-2'>
                                    <Bot size={16} className='text-primary' />
                                    <span className='text-xs font-semibold text-muted-foreground'>
                                      {selectedAgent.fullName}
                                    </span>
                                  </div>
                                )}
                                <div className='whitespace-pre-wrap text-sm leading-relaxed'>
                                  {msg.message}
                                </div>
                                <span
                                  className={cn(
                                    'mt-2 block text-xs font-light italic',
                                    msg.sender === 'You'
                                      ? 'text-end text-primary-foreground/85'
                                      : 'text-muted-foreground/70'
                                  )}
                                >
                                  {format(msg.timestamp, 'h:mm a')}
                                </span>
                              </div>
                            ))}
                            <div className='text-center text-xs text-muted-foreground py-2'>
                              {key}
                            </div>
                          </Fragment>
                        ))}
                    </div>
                  </div>
                </div>
                <form onSubmit={handleSendMessage} className='flex w-full flex-none gap-2'>
                  <div className='flex flex-1 items-center gap-2 rounded-md border border-input bg-card px-2 py-1 focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden lg:gap-4'>
                    <label className='flex-1'>
                      <span className='sr-only'>输入消息</span>
                      <input
                        type='text'
                        placeholder='输入您的问题...'
                        className='h-8 w-full bg-inherit focus-visible:outline-hidden'
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                      />
                    </label>
                    <Button
                      variant='ghost'
                      size='icon'
                      type='submit'
                      className='hidden sm:inline-flex'
                      disabled={!inputMessage.trim()}
                    >
                      <Send size={20} />
                    </Button>
                  </div>
                  <Button className='h-full sm:hidden' type='submit' disabled={!inputMessage.trim()}>
                    <Send size={18} /> 发送
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col justify-center rounded-md border bg-card shadow-xs sm:static sm:z-auto sm:flex'
              )}
            >
              <div className='flex flex-col items-center space-y-6'>
                <div className='flex size-16 items-center justify-center rounded-full border-2 border-border'>
                  <Bot className='size-8' />
                </div>
                <div className='space-y-2 text-center'>
                  <h1 className='text-xl font-semibold'>BeeAI 智能助手</h1>
                  <p className='text-sm text-muted-foreground'>
                    选择左侧的 AI Agent 开始对话，或创建新的对话
                  </p>
                </div>
                <Button onClick={() => setCreateConversationDialog(true)}>
                  <Plus size={18} className='mr-2' />
                  新建对话
                </Button>
              </div>
            </div>
          )}
        </section>
        <NewAIChat
          agents={agents}
          onOpenChange={setCreateConversationDialog}
          open={createConversationDialogOpened}
        />
      </Main>
    </>
  )
}

