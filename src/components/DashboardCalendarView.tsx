import React, { useState, useRef, useEffect } from 'react';
import { format, eachMonthOfInterval, startOfYear, endOfYear, differenceInDays, addYears, subYears, parseISO, isWithinInterval, addDays, eachWeekOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type TripPhase = 'draft' | 'processing' | 'timeline' | 'enrichment' | 'validated';

interface TripWithPhase {
  id: string;
  title: string | null;
  destination_zone: string | null;
  currentPhase: TripPhase;
  startDate?: string | null;
  endDate?: string | null;
  updated_at: string;
}

interface DashboardCalendarViewProps {
  trips: TripWithPhase[];
  onTripClick: (trip: TripWithPhase) => void;
}

export function DashboardCalendarView({ trips, onTripClick }: DashboardCalendarViewProps) {
  // View State
  const [viewStart, setViewStart] = useState(startOfYear(new Date()));
  const [daysVisible, setDaysVisible] = useState(365); // Default to 1 year
  const viewEnd = addDays(viewStart, daysVisible);

  // Drag State
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startViewDate, setStartViewDate] = useState<Date | null>(null);
  const [startScrollTop, setStartScrollTop] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  // State ref for event handlers
  const stateRef = useRef({ viewStart, daysVisible });
  useEffect(() => {
    stateRef.current = { viewStart, daysVisible };
  }, [viewStart, daysVisible]);

  // Filter and sort trips
  const datedTrips = trips
    .filter(t => t.startDate)
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());

  useEffect(() => {
    const checkScrollbar = () => {
      if (bodyRef.current) {
        const width = bodyRef.current.offsetWidth - bodyRef.current.clientWidth;
        setScrollbarWidth(width);
      }
    };

    checkScrollbar();

    const observer = new ResizeObserver(checkScrollbar);
    if (bodyRef.current) {
      observer.observe(bodyRef.current);
    }

    return () => observer.disconnect();
  }, []); // Observer handles updates

  const undatedTrips = trips.filter(t => !t.startDate);

  // Calculate today's position
  const today = new Date();
  const isTodayInView = isWithinInterval(today, { start: viewStart, end: viewEnd });
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const todayOffset = (today.getTime() - viewStart.getTime()) / MS_PER_DAY;
  const todayLeft = (todayOffset / daysVisible) * 100;

  // --- Helpers ---

  const getPhaseLabel = (phase: TripPhase) => {
    const labels: Record<TripPhase, string> = {
      draft: 'Brouillon',
      processing: 'Analyse',
      timeline: 'Organisation',
      enrichment: 'Enrichissement',
      validated: 'Prêt'
    };
    return labels[phase] || phase;
  };

  const getPhaseColor = (phase: TripPhase) => {
    const colors: Record<TripPhase, string> = {
      draft: 'bg-gray-500 border-gray-600',
      processing: 'bg-orange-500 border-orange-600',
      timeline: 'bg-blue-500 border-blue-600',
      enrichment: 'bg-purple-500 border-purple-600',
      validated: 'bg-green-500 border-green-600'
    };
    return colors[phase] || 'bg-gray-500 border-gray-600';
  };

  const getPhaseGradient = (phase: TripPhase) => {
    const gradients: Record<TripPhase, string> = {
      draft: 'from-gray-500 to-gray-600',
      processing: 'from-orange-500 to-orange-600',
      timeline: 'from-blue-500 to-blue-600',
      enrichment: 'from-purple-500 to-purple-600',
      validated: 'from-green-500 to-green-600'
    };
    return gradients[phase] || 'from-gray-500 to-gray-600';
  };

  const getPosition = (startStr: string, endStr?: string | null) => {
    const startDate = parseISO(startStr);
    const endDate = endStr ? parseISO(endStr) : startDate;

    // Check overlap with current view
    if (startDate > viewEnd || endDate < viewStart) return null;

    // Clip dates to view range
    const effectiveStart = startDate < viewStart ? viewStart : startDate;
    const effectiveEnd = endDate > viewEnd ? viewEnd : endDate;

    const offsetDays = (effectiveStart.getTime() - viewStart.getTime()) / MS_PER_DAY;
    const durationDays = (effectiveEnd.getTime() - effectiveStart.getTime()) / MS_PER_DAY + 1;

    const left = (offsetDays / daysVisible) * 100;
    const width = (durationDays / daysVisible) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 0.5)}%` // Minimum width for visibility
    };
  };

  // --- Grid Generation ---

  const getGridItems = () => {
    if (daysVisible > 180) {
      // Month View
      return eachMonthOfInterval({ start: viewStart, end: viewEnd }).map(date => ({
        date,
        label: format(date, 'MMMM', { locale: fr }),
        type: 'month',
        isPrimary: true
      }));
    } else if (daysVisible > 60) {
      // Week View
      return eachWeekOfInterval({ start: viewStart, end: viewEnd }).map(date => ({
        date,
        label: format(date, 'd MMM', { locale: fr }),
        type: 'week',
        isPrimary: true
      }));
    } else {
      // Day View
      return eachDayOfInterval({ start: viewStart, end: viewEnd }).map(date => ({
        date,
        label: format(date, 'd', { locale: fr }),
        type: 'day',
        isPrimary: true
      }));
    }
  };

  const gridItems = getGridItems();

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setStartX(e.clientX);
    setStartY(e.clientY);
    setStartViewDate(viewStart);
    if (bodyRef.current) {
      setStartScrollTop(bodyRef.current.scrollTop);
    }
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startViewDate || !containerRef.current) return;
    
    // Horizontal Drag (Time)
    const deltaPixelsX = e.clientX - startX;
    const containerWidth = containerRef.current.offsetWidth;
    const deltaDays = (deltaPixelsX / containerWidth) * daysVisible;
    const newTime = startViewDate.getTime() - (deltaDays * MS_PER_DAY);
    setViewStart(new Date(newTime));

    // Vertical Drag (Scroll)
    if (bodyRef.current) {
      const deltaPixelsY = e.clientY - startY;
      bodyRef.current.scrollTop = startScrollTop - deltaPixelsY;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setStartViewDate(null);
    document.body.style.cursor = '';
  };

  // Native wheel handler for non-passive event listener
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const { viewStart, daysVisible } = stateRef.current;
      
      const zoomFactor = 0.1;
      const delta = e.deltaY > 0 ? 1 + zoomFactor : 1 - zoomFactor;
      const newDaysVisible = Math.max(7, Math.min(1095, daysVisible * delta)); // Clamp between 7 days and 3 years
      
      // Adjust viewStart to zoom towards center
      const center = addDays(viewStart, daysVisible / 2);
      const newViewStart = addDays(center, -newDaysVisible / 2);

      setDaysVisible(newDaysVisible);
      setViewStart(newViewStart);
    };
    
    wrapper.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheelNative);
  }, []);

  // Clean up global mouse events if needed (usually handled by React synthetic events on container)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setStartViewDate(null);
        document.body.style.cursor = '';
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);


  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight capitalize">
              {daysVisible > 180 
                ? format(addDays(viewStart, daysVisible/2), 'yyyy') 
                : format(addDays(viewStart, daysVisible/2), 'MMMM yyyy', { locale: fr })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {daysVisible > 180 ? "Vue annuelle" : daysVisible > 60 ? "Vue trimestrielle" : "Vue mensuelle"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setDaysVisible(Math.min(1095, daysVisible * 1.2))} title="Zoom arrière">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDaysVisible(Math.max(7, daysVisible / 1.2))} title="Zoom avant">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-8 bg-border mx-2" />
          <Button variant="outline" size="icon" onClick={() => setViewStart(addYears(viewStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setViewStart(addDays(new Date(), -daysVisible/2))}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => setViewStart(addYears(viewStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <Card 
        className="overflow-hidden border-2 flex flex-col h-[600px] relative"
        ref={wrapperRef}
      >
        {/* Timeline Header */}
        <div 
          className="flex border-b h-14 bg-muted/30 flex-shrink-0 z-30"
          style={{ paddingRight: scrollbarWidth }}
        >
          <div className="w-72 flex-shrink-0 bg-background/95 backdrop-blur border-r flex items-center px-6 font-semibold text-muted-foreground shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-40">
            Voyages
          </div>
          
          {/* Draggable Header Area */}
          <div 
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            {gridItems.map((item, i) => {
               const offset = (item.date.getTime() - viewStart.getTime()) / MS_PER_DAY;
               const left = (offset / daysVisible) * 100;
               
               // Calculate width accurately for background/border
               let duration = 0;
               if (item.type === 'month') duration = differenceInDays(endOfMonth(item.date), item.date) + 1;
               else if (item.type === 'week') duration = 7;
               else duration = 1;
               const width = (duration / daysVisible) * 100;

               // Only render if visible (0 to 100%)
               if (left < -20 || left > 120) return null;

               const isMonthStart = item.date.getDate() === 1;
               const isWeekendDay = item.type === 'day' && isWeekend(item.date);

               return (
                <div 
                  key={item.date.toString()} 
                  className={`absolute top-0 bottom-0 flex items-center justify-center text-sm font-medium text-muted-foreground transition-all duration-75 ${
                    isMonthStart ? 'border-l-2 border-foreground/20' : 'border-l border-border/50'
                  } ${isWeekendDay ? 'bg-muted/60' : ''}`}
                  style={{ 
                    left: `${left}%`, 
                    width: `${width}%`
                  }}
                >
                  <span className="pl-2 whitespace-nowrap">{item.label}</span>
                </div>
               );
            })}
            
            {/* Today Marker in Header */}
            {isTodayInView && (
              <div 
                className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
                style={{ left: `${todayLeft}%` }}
              >
                <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-b-sm shadow-sm whitespace-nowrap">
                  Aujourd'hui
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div 
          className="overflow-y-auto flex-1 relative"
          ref={bodyRef}
        >
           <div className="min-h-full">
            {datedTrips.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  Aucun voyage planifié sur cette période
                </div>
              ) : (
                datedTrips.map((trip) => {
                  const pos = getPosition(trip.startDate!, trip.endDate);
                  // If pos is null, it means it's completely out of view. 
                  // But we might want to render it if it's partially in view? 
                  // getPosition handles partial overlap.
                  if (!pos) return null; 

                  const daysUntilStart = differenceInDays(parseISO(trip.startDate!), new Date());
                  const isUpcoming = daysUntilStart > 0;

                  return (
                    <div key={trip.id} className="flex h-24 relative group hover:bg-muted/30 transition-colors border-b border-border/50">
                      {/* Sticky Left Column: Trip Info */}
                      <div 
                        className="w-72 flex-shrink-0 sticky left-0 bg-background/95 backdrop-blur z-20 border-r p-4 flex flex-col justify-center cursor-pointer shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] group-hover:bg-background/80 transition-colors"
                        onClick={() => onTripClick(trip)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border-opacity-50 ${getPhaseColor(trip.currentPhase).split(' ')[1]} text-foreground`}>
                            {getPhaseLabel(trip.currentPhase)}
                          </Badge>
                          {isUpcoming && (
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 shadow-sm">
                              J-{daysUntilStart}
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold truncate text-sm mb-1 group-hover:text-primary transition-colors">
                          {trip.title || 'Voyage sans titre'}
                        </h4>
                        {trip.destination_zone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{trip.destination_zone}</span>
                          </div>
                        )}
                      </div>

                      {/* Timeline Bar Area */}
                      <div 
                        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                      >
                        {/* Background Grid */}
                        <div className="absolute inset-0 pointer-events-none">
                          {gridItems.map((item, i) => {
                             const offset = (item.date.getTime() - viewStart.getTime()) / MS_PER_DAY;
                             const left = (offset / daysVisible) * 100;
                             
                             // Calculate width accurately
                             let duration = 0;
                             if (item.type === 'month') duration = differenceInDays(endOfMonth(item.date), item.date) + 1;
                             else if (item.type === 'week') duration = 7;
                             else duration = 1;
                             const width = (duration / daysVisible) * 100;

                             if (left < -20 || left > 120) return null;
                             
                             const isMonthStart = item.date.getDate() === 1;
                             const isWeekendDay = item.type === 'day' && isWeekend(item.date);

                             return (
                                <div 
                                  key={i} 
                                  className={`absolute top-0 bottom-0 ${
                                    isMonthStart ? 'border-l-2 border-foreground/20' : 'border-l border-border/30'
                                  } ${isWeekendDay ? 'bg-muted/30' : ''}`}
                                  style={{ 
                                    left: `${left}%`,
                                    width: `${width}%`
                                  }}
                                />
                             );
                          })}
                        </div>

                        {/* Today Line in Row */}
                        {isTodayInView && (
                          <div 
                            className="absolute top-0 bottom-0 w-px bg-red-500/40 z-0 pointer-events-none"
                            style={{ left: `${todayLeft}%` }}
                          />
                        )}

                        {/* The Trip Bar */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-10 top-1/2 -translate-y-1/2 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 bg-gradient-to-r ${getPhaseGradient(trip.currentPhase)} border border-white/10`}
                                style={{ 
                                  left: pos.left, 
                                  width: pos.width,
                                  minWidth: '4px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent drag start
                                  onTripClick(trip);
                                }}
                                onMouseDown={(e) => e.stopPropagation()} // Prevent drag start on bar click
                              >
                                {/* Inner content if wide enough */}
                                <div className="h-full w-full flex items-center px-3 overflow-hidden">
                                  <span className="text-xs font-bold text-white drop-shadow-md truncate opacity-90">
                                    {trip.title}
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs font-medium">
                                <p>{trip.title}</p>
                                <p className="text-muted-foreground">
                                  {format(parseISO(trip.startDate!), 'dd MMM')} - {trip.endDate ? format(parseISO(trip.endDate), 'dd MMM yyyy') : '?'}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  );
                })
              )}
           </div>
        </div>
      </Card>

      {/* Undated Trips Footer */}
      {undatedTrips.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Voyages sans dates définies ({undatedTrips.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {undatedTrips.map(trip => (
              <Card 
                key={trip.id} 
                className="cursor-pointer hover:shadow-md transition-all bg-muted/20 hover:bg-card border-dashed"
                onClick={() => onTripClick(trip)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {getPhaseLabel(trip.currentPhase)}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm truncate">{trip.title || 'Sans titre'}</h4>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
