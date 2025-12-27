import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Trainset, Decision } from "@/types";

import { Train, Sparkles, Gauge } from 'lucide-react';

interface DraggableTrainsetBoardProps {
  trainsets: Trainset[];
  onDragEnd: (trainsetId: string, newDecision: Decision) => void;
}

const DraggableTrainsetBoard = ({ trainsets, onDragEnd }: DraggableTrainsetBoardProps) => {
  const columns: { id: Decision; title: string; colorClass: string; bgClass: string }[] = [
    { id: 'REVENUE', title: 'Revenue Service', colorClass: 'border-t-revenue', bgClass: 'bg-revenue/5' },
    { id: 'STANDBY', title: 'Standby', colorClass: 'border-t-standby', bgClass: 'bg-standby/5' },
    { id: 'IBL', title: 'IBL (Maintenance)', colorClass: 'border-t-ibl', bgClass: 'bg-ibl/5' },
  ];

  const getTrainsetsByDecision = (decision: Decision) => 
    trainsets.filter(t => t.recommendation === decision);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const trainsetId = result.draggableId;
    const newDecision = result.destination.droppableId as Decision;
    
    onDragEnd(trainsetId, newDecision);
  };

  const getBrandingColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-revenue';
      case 'MEDIUM': return 'text-standby';
      case 'LOW': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(column => (
          <div 
            key={column.id} 
            className={`${column.bgClass} rounded-xl border border-border ${column.colorClass} border-t-4 overflow-hidden`}
          >
            <div className="p-4 border-b border-border bg-card/50">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">{column.title}</h4>
                <span className="px-2 py-1 bg-secondary rounded-full text-xs font-mono text-muted-foreground">
                  {getTrainsetsByDecision(column.id).length}
                </span>
              </div>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-3 min-h-[200px] transition-colors duration-200 ${
                    snapshot.isDraggingOver ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="space-y-2">
                    {getTrainsetsByDecision(column.id).map((trainset, index) => (
                      <Draggable key={trainset.id} draggableId={trainset.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`
                              bg-card p-3 rounded-lg border border-border cursor-grab
                              transition-all duration-200
                              ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary rotate-2' : 'shadow-sm hover:shadow-md hover:border-primary/50'}
                            `}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Train className="w-4 h-4 text-primary" />
                              <span className="font-mono font-bold text-foreground">{trainset.id}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className={`flex items-center gap-1 ${getBrandingColor(trainset.brandingPriority)}`}>
                                <Sparkles className="w-3 h-3" />
                                {trainset.brandingPriority}
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Gauge className="w-3 h-3" />
                                {trainset.mileageKm.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default DraggableTrainsetBoard;