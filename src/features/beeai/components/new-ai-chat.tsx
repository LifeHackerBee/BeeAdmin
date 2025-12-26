import { useState } from 'react'
import { Check, X, Bot } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type AIAgent } from '../data/beeai-types'

type Agent = Omit<AIAgent, 'messages'>

type NewAIChatProps = {
  agents: Agent[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewAIChat({ agents, onOpenChange, open }: NewAIChatProps) {
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([])

  const handleSelectAgent = (agent: Agent) => {
    if (!selectedAgents.find((a) => a.id === agent.id)) {
      setSelectedAgents([...selectedAgents, agent])
    } else {
      handleRemoveAgent(agent.id)
    }
  }

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter((agent) => agent.id !== agentId))
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    // Reset selected agents when dialog closes
    if (!newOpen) {
      setSelectedAgents([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>选择 AI Agent</DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-wrap items-baseline-last gap-2'>
            <span className='min-h-6 text-sm text-muted-foreground'>选择:</span>
            {selectedAgents.map((agent) => (
              <Badge key={agent.id} variant='default'>
                {agent.fullName}
                <button
                  className='ms-1 rounded-full ring-offset-background outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRemoveAgent(agent.id)
                    }
                  }}
                  onClick={() => handleRemoveAgent(agent.id)}
                >
                  <X className='h-3 w-3 text-muted-foreground hover:text-foreground' />
                </button>
              </Badge>
            ))}
          </div>
          <Command className='rounded-lg border'>
            <CommandInput
              placeholder='搜索 AI Agent...'
              className='text-foreground'
            />
            <CommandList>
              <CommandEmpty>未找到 AI Agent</CommandEmpty>
              <CommandGroup>
                {agents.map((agent) => (
                  <CommandItem
                    key={agent.id}
                    onSelect={() => handleSelectAgent(agent)}
                    className='flex items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground'
                  >
                    <div className='flex items-center gap-2 flex-1 min-w-0'>
                      <div className='flex items-center justify-center size-8 rounded-full bg-muted'>
                        <span className='text-lg'>{agent.profile}</span>
                      </div>
                      <div className='flex flex-col flex-1 min-w-0'>
                        <span className='text-sm font-medium truncate'>
                          {agent.fullName}
                        </span>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs text-accent-foreground/70 truncate'>
                            {agent.title}
                          </span>
                          {agent.category && (
                            <Badge variant='outline' className='text-xs px-1 py-0'>
                              {agent.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedAgents.find((a) => a.id === agent.id) && (
                      <Check className='h-4 w-4 flex-shrink-0' />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <Button
            variant={'default'}
            onClick={() => showSubmittedData(selectedAgents)}
            disabled={selectedAgents.length === 0}
          >
            <Bot size={18} className='mr-2' />
            开始对话
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

