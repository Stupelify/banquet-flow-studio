import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from '@/lib/router-compat';
import { AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useSSE } from '@/hooks/useSSE';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import { api } from '@/lib/api';
import { useBookingForm } from '../bookings/_hooks/useBookingForm';
import BookingFormModal from '../bookings/_components/BookingFormModal';
import { customerSearchText, textMatchesSearch } from '@/lib/customerSearch';
import { formatDateLongIN, formatMonthYearIN, formatWeekdayDateIN } from '@/lib/date';
import type { GlobalSearchHit } from '@/lib/api';
import { CalendarPageSkeleton } from '@/components/Skeletons';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import CalendarHeader from './_components/CalendarHeader';
import CalendarSidebar from './_components/CalendarSidebar';
import type { SidebarGroup } from './_components/CalendarSidebar';
import DayPrintView from './_components/DayPrintView';
import DayTimelineBoard from './_components/DayTimelineBoard';
import EventDetailPanel from './_components/EventDetailPanel';
import type { SelectedEvent } from './_components/EventDetailPanel';
import MiniCalendar from './_components/MiniCalendar';
import MobileFilterSheet from './_components/MobileFilterSheet';
import MobileMonthAgenda from './_components/MobileMonthAgenda';
import MonthBoard from './_components/MonthBoard';
import type { MonthLine } from './_components/MonthBoard';
import WeekBoard from './_components/WeekBoard';
import { CTA_NEW_BOOKING } from './copy';
import {
  buildBanquetIndex,
  compactClock,
} from './_lib/event-styles';
import type {
  BookingCalendarRow,
  BookingDetail,
  CalendarViewMode,
  EnquiryCalendarRow,
  GoogleCalendarEventRow,
  HallBoardRow,
  HallBoardSlot,
  HallCalendarOption,
} from './_lib/types';
import {
  bookingSortMinutes,
  bookingTimeLabel,
  buildWeekDays,
  dateToKey,
  endOfDay,
  endOfWeek,
  eventDateKey,
  fetchBookings,
  fetchEnquiries,
  fetchGoogleCalendarEvents,
  fetchHalls,
  findDayHallConflicts,
  formatClockDisplay,
  formatDateKey,
  formatEventClock,
  getBookingHallNames,
  getPrimaryHallName,
  googleEventRangeMinutes,
  googleEventSortMinutes,
  googleEventTimeLabel,
  monthBounds,
  parseClockToMinutes,
  parseDateKey,
  resolveBookingStatus,
  resolveBookingTimeRange,
  resolveEnquiryStatus,
  startOfDay,
  startOfWeek,
  toSafeNumber,
} from './_lib/calendar-helpers';

// Statuses shown by default (cancelled hidden). Module scope keeps the ref
// stable for the activeFilterCount / reset deps.
const DEFAULT_STATUS_KEYS = ['confirmed', 'enquiry', 'pencil', 'quotation', 'pending'];

// Stable empty fallbacks so `data ?? []` doesn't invalidate memos every render.
const NO_BOOKINGS: BookingCalendarRow[] = [];
const NO_ENQUIRIES: EnquiryCalendarRow[] = [];
const NO_GOOGLE_EVENTS: GoogleCalendarEventRow[] = [];
const NO_HALLS: HallCalendarOption[] = [];
const NO_CALENDAR_LOAD_ERRORS: Array<'bookings' | 'enquiries' | 'google'> = [];

function CalendarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);
  const canAddBooking = hasAnyPermission(permissionSet, ['add_booking', 'manage_bookings']);
  const canEditBooking = hasAnyPermission(permissionSet, ['edit_booking', 'manage_bookings']);
  const isAuthenticated = Boolean(user);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [viewDate, setViewDate] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
  const [search, setSearch] = useState('');
  const [printingDay, setPrintingDay] = useState(false);
  const [printBookings, setPrintBookings] = useState<BookingDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 859px)');
  const monthFit = viewMode === 'month' && !isMobile;

  const setCalendarViewMode = useCallback(
    (mode: CalendarViewMode) => {
      setViewMode(isMobile ? 'month' : mode);
    },
    [isMobile]
  );

  useEffect(() => {
    if (isMobile && viewMode !== 'month') {
      setViewMode('month');
    }
  }, [isMobile, viewMode]);

  const queryClient = useQueryClient();
  const hallsQuery = useQuery({
    queryKey: queryKeys.calendar.halls(),
    queryFn: fetchHalls,
    enabled: isAuthenticated,
  });
  const halls = hallsQuery.data ?? NO_HALLS;

  const [selectedHallIds, setSelectedHallIds] = useState<Set<string> | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    () => new Set(DEFAULT_STATUS_KEYS)
  );

  useEffect(() => {
    if (halls.length > 0 && selectedHallIds === null) {
      setSelectedHallIds(new Set(halls.map((h) => h.id)));
    }
  }, [halls, selectedHallIds]);

  const toggleHall = useCallback((hallId: string) => {
    setSelectedHallIds((prev) => {
      const base = prev ?? new Set(halls.map((h) => h.id));
      const next = new Set(base);
      if (next.has(hallId)) {
        if (next.size <= 1) return next;
        next.delete(hallId);
      } else {
        next.add(hallId);
      }
      return next;
    });
  }, [halls]);

  const toggleBanquetGroup = useCallback((hallIds: string[]) => {
    if (hallIds.length === 0) return;
    setSelectedHallIds((prev) => {
      const base = prev ?? new Set(halls.map((h) => h.id));
      const next = new Set(base);
      const allOn = hallIds.every((id) => next.has(id));
      if (allOn) {
        const remaining = [...next].filter((id) => !hallIds.includes(id));
        if (remaining.length === 0) return next;
        hallIds.forEach((id) => next.delete(id));
      } else {
        hallIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [halls]);

  const toggleStatus = useCallback((status: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  useEffect(() => {
    const now = new Date();
    setViewDate(startOfDay(now));
    setSelectedDate(formatDateKey(now));
  }, []);

  const openEnquiryDetails = useCallback((enquiryId: string) => {
    if (!enquiryId) return;
    router.push(`/dashboard/enquiries?section=edit&id=${enquiryId}`);
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setPrintBookings([]);
    window.addEventListener('afterprint', handler);
    return () => window.removeEventListener('afterprint', handler);
  }, []);

  const range = useMemo(() => {
    if (viewMode === 'month') {
      return monthBounds(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
    }
    if (viewMode === 'week') {
      return { start: startOfWeek(viewDate), end: endOfWeek(viewDate) };
    }
    return { start: startOfDay(viewDate), end: endOfDay(viewDate) };
  }, [viewMode, viewDate]);

  const calendarQuery = useQuery({
    queryKey: queryKeys.calendar.range({
      from: range.start.toISOString(),
      to: range.end.toISOString(),
    }),
    queryFn: async () => {
      const [bookingsResult, enquiriesResult, googleResult] = await Promise.allSettled([
        fetchBookings(range.start, range.end),
        fetchEnquiries(range.start, range.end),
        fetchGoogleCalendarEvents(range.start, range.end),
      ]);

      const loadErrors: Array<'bookings' | 'enquiries' | 'google'> = [];
      let bookings = NO_BOOKINGS;
      let enquiries = NO_ENQUIRIES;
      let bookingsTruncated = false;
      let enquiriesTruncated = false;
      let google = {
        enabled: false,
        configured: false,
        sourceCount: 0,
        events: NO_GOOGLE_EVENTS,
      };

      if (bookingsResult.status === 'fulfilled') {
        bookings = bookingsResult.value.rows;
        bookingsTruncated = bookingsResult.value.truncated;
      } else {
        loadErrors.push('bookings');
      }

      if (enquiriesResult.status === 'fulfilled') {
        enquiries = enquiriesResult.value.rows;
        enquiriesTruncated = enquiriesResult.value.truncated;
      } else {
        loadErrors.push('enquiries');
      }

      if (googleResult.status === 'fulfilled') {
        google = googleResult.value;
      } else {
        loadErrors.push('google');
      }

      if (loadErrors.length === 3) {
        throw new Error('Failed to load calendar data');
      }

      return { bookings, enquiries, google, loadErrors, bookingsTruncated, enquiriesTruncated };
    },
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });

  const bookings = calendarQuery.data?.bookings ?? NO_BOOKINGS;
  const enquiries = calendarQuery.data?.enquiries ?? NO_ENQUIRIES;
  const googleEvents = calendarQuery.data?.google.events ?? NO_GOOGLE_EVENTS;
  const calendarLoadErrors = calendarQuery.data?.loadErrors ?? NO_CALENDAR_LOAD_ERRORS;
  const bookingsTruncated = calendarQuery.data?.bookingsTruncated ?? false;
  const enquiriesTruncated = calendarQuery.data?.enquiriesTruncated ?? false;
  const loading = calendarQuery.isPending;
  const showStaleOverlay = calendarQuery.isFetching && calendarQuery.isPlaceholderData;

  const calendarLoadErrorLabel = useMemo(() => {
    const labels: Record<(typeof calendarLoadErrors)[number], string> = {
      bookings: 'bookings',
      enquiries: 'enquiries',
      google: 'Google Calendar events',
    };
    return calendarLoadErrors.map((key) => labels[key]).join(', ');
  }, [calendarLoadErrors]);

  useEffect(() => {
    setSelectedDate((prev) => {
      if (viewMode === 'month') {
        const prevDate = parseDateKey(prev);
        if (
          prevDate.getMonth() === viewDate.getMonth() &&
          prevDate.getFullYear() === viewDate.getFullYear()
        ) {
          return prev;
        }
        const today = new Date();
        const inThisMonth =
          today.getMonth() === viewDate.getMonth() &&
          today.getFullYear() === viewDate.getFullYear();
        return inThisMonth ? formatDateKey(today) : formatDateKey(range.start);
      }
      return formatDateKey(viewDate);
    });
  }, [viewMode, viewDate, range.start]);

  const invalidateCalendar = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
  }, [queryClient]);

  const bookingForm = useBookingForm({
    onDataChanged: invalidateCalendar,
  });
  const { openCreateBooking, openEditBooking } = bookingForm;
  const isBookingFormOpen =
    bookingForm.showCreateForm ||
    bookingForm.bookingLoadState === 'loading' ||
    (bookingForm.bookingLoadState === 'error' && Boolean(bookingForm.editingBookingId));
  const isEventModalOpen = Boolean(selectedEvent);

  const openBookingEdit = useCallback(
    (bookingId: string) => {
      if (!bookingId || !canEditBooking) return;
      void openEditBooking(bookingId);
    },
    [canEditBooking, openEditBooking]
  );

  const openNewBooking = useCallback(
    (args?: { date?: string; hallId?: string; slot?: string }) => {
      if (!canAddBooking) return;
      void openCreateBooking(args);
    },
    [canAddBooking, openCreateBooking]
  );

  const deepLinkSection = searchParams.get('section');
  const deepLinkId = searchParams.get('id');
  const deepLinkDate = searchParams.get('date');
  const deepLinkHall = searchParams.get('hall');
  const deepLinkSlot = searchParams.get('slot');
  const handledDeepLinkRef = useRef<string | null>(null);

  useEffect(() => {
    const section = deepLinkSection;
    const id = deepLinkId;
    const deepLinkKey = JSON.stringify([
      section,
      id,
      deepLinkDate,
      deepLinkHall,
      deepLinkSlot,
    ]);
    if (!section) {
      handledDeepLinkRef.current = null;
      return;
    }
    if (handledDeepLinkRef.current === deepLinkKey) return;

    if (section === 'edit' && id && canEditBooking) {
      handledDeepLinkRef.current = deepLinkKey;
      void openEditBooking(id);
      router.replace('/dashboard/calendar');
    } else if (section === 'new' && canAddBooking) {
      handledDeepLinkRef.current = deepLinkKey;
      void openCreateBooking({
        date: deepLinkDate || undefined,
        hallId: deepLinkHall || undefined,
        slot: deepLinkSlot || undefined,
      });
      router.replace('/dashboard/calendar');
    }
  }, [
    canAddBooking,
    canEditBooking,
    deepLinkDate,
    deepLinkHall,
    deepLinkId,
    deepLinkSection,
    deepLinkSlot,
    openCreateBooking,
    openEditBooking,
    router,
  ]);

  const handleJumpToDate = useCallback((dateKey: string) => {
    if (!dateKey) return;
    const parsedDate = parseDateKey(dateKey);
    if (Number.isNaN(parsedDate.getTime())) return;
    setSelectedDate(dateKey);
    setViewDate(startOfDay(parsedDate));
  }, []);

  const calendarDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedInvalidateCalendar = useCallback(() => {
    if (calendarDebounceTimerRef.current) clearTimeout(calendarDebounceTimerRef.current);
    calendarDebounceTimerRef.current = setTimeout(invalidateCalendar, 300);
  }, [invalidateCalendar]);
  useEffect(() => {
    return () => {
      if (calendarDebounceTimerRef.current) clearTimeout(calendarDebounceTimerRef.current);
    };
  }, []);
  useSSE(['booking:', 'enquiry:'], debouncedInvalidateCalendar, isAuthenticated);

  const searchQuery = search.trim().toLowerCase();

  const [elsewhereHits, setElsewhereHits] = useState<GlobalSearchHit[]>([]);
  const loadedIds = useMemo(() => {
    const ids = new Set<string>();
    bookings.forEach((b) => ids.add(b.id));
    enquiries.forEach((e) => ids.add(e.id));
    return ids;
  }, [bookings, enquiries]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setElsewhereHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await api.search(q);
        if (cancelled) return;
        const data = response.data?.data;
        const hits = [...(data?.bookings || []), ...(data?.enquiries || [])].filter(
          (hit) => hit.functionDate && !loadedIds.has(hit.id)
        );
        setElsewhereHits(hits);
      } catch {
        if (!cancelled) setElsewhereHits([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, loadedIds]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((entry) => {
      if (searchQuery) {
        const haystack = [
          entry.functionName,
          entry.functionType,
          entry.status,
          customerSearchText(entry.customer ?? {}),
          getBookingHallNames(entry).join(' '),
        ].join(' ');
        if (!textMatchesSearch(haystack, searchQuery)) return false;
      }
      if (selectedHallIds !== null) {
        const hallNames = getBookingHallNames(entry);
        const bookingHallIds = (entry.halls || [])
          .map((h) => h.hall?.id || h.hallId || '')
          .filter(Boolean);
        const hasSelectedHall =
          bookingHallIds.some((id) => selectedHallIds.has(id)) ||
          (bookingHallIds.length === 0 && selectedHallIds.size > 0);
        if (!hasSelectedHall && hallNames.length > 0) return false;
      }
      const effectiveStatus = resolveBookingStatus(entry);
      if (!selectedStatuses.has(effectiveStatus)) return false;
      return true;
    });
  }, [bookings, searchQuery, selectedHallIds, selectedStatuses]);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((entry) => {
      if (searchQuery) {
        const haystack = [
          entry.functionName,
          entry.functionType,
          entry.status,
          customerSearchText(entry.customer ?? {}),
        ].join(' ');
        if (!textMatchesSearch(haystack, searchQuery)) return false;
      }
      const effectiveStatus = resolveEnquiryStatus(entry);
      if (!selectedStatuses.has(effectiveStatus)) return false;
      return true;
    });
  }, [enquiries, searchQuery, selectedStatuses]);

  const filteredGoogleEvents = useMemo(() => {
    if (!searchQuery) return googleEvents;
    return googleEvents.filter((entry) =>
      [
        entry.title,
        entry.venueName,
        entry.status,
        entry.location || '',
        entry.description || '',
        entry.origin,
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchQuery)
    );
  }, [googleEvents, searchQuery]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingCalendarRow[]>();
    filteredBookings.forEach((entry) => {
      const key = dateToKey(entry.functionDate);
      if (!key) return;
      const bucket = map.get(key) || [];
      bucket.push(entry);
      map.set(key, bucket);
    });

    map.forEach((rows) =>
      rows.sort((a, b) => {
        const dateDiff = new Date(a.functionDate).getTime() - new Date(b.functionDate).getTime();
        if (dateDiff !== 0) return dateDiff;
        const timeDiff = bookingSortMinutes(a) - bookingSortMinutes(b);
        if (timeDiff !== 0) return timeDiff;
        return a.functionName.localeCompare(b.functionName);
      })
    );
    return map;
  }, [filteredBookings]);

  const enquiriesByDate = useMemo(() => {
    const map = new Map<string, EnquiryCalendarRow[]>();
    filteredEnquiries.forEach((entry) => {
      const key = dateToKey(entry.functionDate);
      if (!key) return;
      const bucket = map.get(key) || [];
      bucket.push(entry);
      map.set(key, bucket);
    });

    map.forEach((rows) =>
      rows.sort(
        (a, b) => new Date(a.functionDate).getTime() - new Date(b.functionDate).getTime()
      )
    );
    return map;
  }, [filteredEnquiries]);

  const googleEventsByDate = useMemo(() => {
    const map = new Map<string, GoogleCalendarEventRow[]>();
    filteredGoogleEvents.forEach((entry) => {
      const key = eventDateKey(entry.start);
      if (!key) return;
      const bucket = map.get(key) || [];
      bucket.push(entry);
      map.set(key, bucket);
    });

    map.forEach((rows) =>
      rows.sort((a, b) => {
        const dateDiff = new Date(a.start).getTime() - new Date(b.start).getTime();
        if (dateDiff !== 0) return dateDiff;
        const timeDiff = googleEventSortMinutes(a) - googleEventSortMinutes(b);
        if (timeDiff !== 0) return timeDiff;
        return a.title.localeCompare(b.title);
      })
    );

    return map;
  }, [filteredGoogleEvents]);

  const selectedBookings = useMemo(
    () => bookingsByDate.get(selectedDate) || NO_BOOKINGS,
    [bookingsByDate, selectedDate]
  );

  const conflictsByDate = useMemo(() => {
    const map = new Map<string, ReturnType<typeof findDayHallConflicts>>();
    bookingsByDate.forEach((rows, key) => {
      const conflicts = findDayHallConflicts(rows);
      if (conflicts.length > 0) map.set(key, conflicts);
    });
    return map;
  }, [bookingsByDate]);
  const viewConflictCount = useMemo(() => {
    let count = 0;
    conflictsByDate.forEach((conflicts) => {
      count += conflicts.length;
    });
    return count;
  }, [conflictsByDate]);
  const selectedDayConflicts = conflictsByDate.get(selectedDate) || [];
  const otherConflictDates = useMemo(
    () => Array.from(conflictsByDate.keys()).filter((key) => key !== selectedDate).sort(),
    [conflictsByDate, selectedDate]
  );
  const selectedDateLabel = formatDateLongIN(parseDateKey(selectedDate));

  const monthLabel = formatMonthYearIN(viewDate);
  const weekDays = useMemo(() => buildWeekDays(viewDate), [viewDate]);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekLabel = `${formatWeekdayDateIN(weekStart, { day: 'numeric', month: 'short' })} - ${formatWeekdayDateIN(weekEnd, { day: 'numeric', month: 'short', withYear: true })}`;
  const viewLabel =
    viewMode === 'month'
      ? monthLabel
      : viewMode === 'week'
        ? weekLabel
        : formatDateLongIN(viewDate);
  const todayKey = formatDateKey(new Date());

  const hallStats = useMemo(() => {
    const activeBookings = bookings.filter((b) => resolveBookingStatus(b) !== 'cancelled');
    return halls.map((hall) => {
      const count = activeBookings.filter((b) =>
        (b.halls || []).some((h) => h.hall?.id === hall.id)
      ).length;
      return { ...hall, count };
    });
  }, [halls, bookings]);

  const hallStatsByLocation = useMemo(() => {
    const groups = new Map<string, typeof hallStats>();
    hallStats.forEach((hall) => {
      const location = hall.banquetName?.trim() || 'Unassigned';
      const bucket = groups.get(location) || [];
      bucket.push(hall);
      groups.set(location, bucket);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
  }, [hallStats]);

  const handlePrintDay = useCallback(async () => {
    if (selectedBookings.length === 0) {
      toast.error('No bookings available for this day.');
      return;
    }
    try {
      setPrintingDay(true);
      const detailRows = await Promise.all(
        selectedBookings.map((booking) =>
          api.getBooking(booking.id).then((res) => res.data?.data?.booking as BookingDetail)
        )
      );
      setPrintBookings(detailRows.filter(Boolean));
      setTimeout(() => window.print(), 250);
    } catch {
      toast.error('Failed to prepare print view.');
    } finally {
      setPrintingDay(false);
    }
  }, [selectedBookings]);

  const hallMetaById = useMemo(() => {
    const map = new Map<string, HallCalendarOption>();
    halls.forEach((hall) => map.set(hall.id, hall));
    return map;
  }, [halls]);

  const hallMetaByName = useMemo(() => {
    const map = new Map<string, HallCalendarOption>();
    halls.forEach((hall) => map.set(hall.name.toLowerCase(), hall));
    return map;
  }, [halls]);

  const hallBoardRows = useMemo<HallBoardRow[]>(() => {
    const blockedBookings = filteredBookings.filter((entry) => resolveBookingStatus(entry) !== 'cancelled');
    const map = new Map<string, HallBoardRow>();

    halls.forEach((hall) => {
      if (selectedHallIds !== null && !selectedHallIds.has(hall.id)) return;
      map.set(`hall:${hall.id}`, {
        hallId: hall.id,
        hallName: hall.name,
        banquetName: hall.banquetName || '',
        slots: [],
      });
    });

    blockedBookings.forEach((entry) => {
      const bookingDate = new Date(entry.functionDate).getTime();
      const bookingMinutes = bookingSortMinutes(entry);
      const timeLabel = bookingTimeLabel(entry);
      const { startMinutes, endMinutes } = resolveBookingTimeRange(entry);
      const hallRows = entry.halls || [];
      const effectiveHallRows =
        hallRows.length > 0
          ? hallRows
          : [
            {
              hallId: '',
              hall: {
                id: '',
                name: 'Unassigned Hall',
              },
            },
          ];

      effectiveHallRows.forEach((hallRow) => {
        const hallId = hallRow.hall?.id || hallRow.hallId || '';
        const hallName = (hallRow.hall?.name || 'Unassigned Hall').trim() || 'Unassigned Hall';
        const fromId = hallId ? hallMetaById.get(hallId) : undefined;
        const fromName = hallMetaByName.get(hallName.toLowerCase());
        const meta = fromId || fromName;
        const resolvedHallId = meta?.id || hallId || '';
        if (resolvedHallId && selectedHallIds !== null && !selectedHallIds.has(resolvedHallId)) {
          return;
        }
        const key = resolvedHallId ? `hall:${resolvedHallId}` : `other:${hallName.toLowerCase()}`;
        const row = map.get(key) || {
          hallId: resolvedHallId || undefined,
          hallName: meta?.name || hallName,
          banquetName: meta?.banquetName || '',
          slots: [],
        };

        row.slots.push({
          bookingId: entry.id,
          date: (() => {
            const d = new Date(entry.functionDate);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })(),
          timeLabel,
          functionName: entry.functionName,
          functionType: entry.functionType,
          customerName: entry.customer?.name || 'Customer',
          status: resolveBookingStatus(entry),
          sortKey:
            bookingDate + (Number.isFinite(bookingMinutes) ? bookingMinutes * 60 * 1000 : 0),
          startMinutes,
          endMinutes,
          guests: toSafeNumber(entry.expectedGuests),
          isPencilBooking: entry.isPencilBooking,
          pencilExpiresAt: entry.pencilExpiresAt,
          source: 'software',
        });

        map.set(key, row);
      });
    });

    filteredGoogleEvents.forEach((entry) => {
      if ((entry.status || '').toLowerCase() === 'cancelled') {
        return;
      }

      const rowKey = `venue:${entry.venueName.toLowerCase()}`;
      const row = map.get(rowKey) || {
        hallName: entry.venueName,
        banquetName: 'Google Calendar Venue',
        rowType: 'googleVenue' as const,
        slots: [],
      };

      const startMs = new Date(entry.start).getTime();
      const sortMinutes = googleEventSortMinutes(entry);
      const { startMinutes, endMinutes } = googleEventRangeMinutes(entry);

      row.slots.push({
        date: eventDateKey(entry.start),
        timeLabel: googleEventTimeLabel(entry),
        functionName: entry.title,
        location: entry.location,
        status: entry.status,
        sortKey: startMs + (Number.isFinite(sortMinutes) ? sortMinutes * 60 * 1000 : 0),
        startMinutes,
        endMinutes,
        source: 'google',
        htmlLink: entry.htmlLink,
      });

      map.set(rowKey, row);
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        slots: [...row.slots].sort((a, b) => a.sortKey - b.sortKey),
      }))
      .sort((a, b) => a.hallName.localeCompare(b.hallName));
  }, [filteredBookings, filteredGoogleEvents, hallMetaById, hallMetaByName, halls, selectedHallIds]);

  const viewSubtitle = useMemo(() => {
    const bookingCount = filteredBookings.length + filteredEnquiries.length;
    const hallCount = hallStatsByLocation.reduce((sum, [, hs]) => sum + hs.length, 0);
    const parts = [`${bookingCount} booking${bookingCount === 1 ? '' : 's'}`];
    if (hallCount > 0) parts.push(`${hallCount} hall${hallCount === 1 ? '' : 's'}`);
    if (viewConflictCount > 0) parts.push(`${viewConflictCount} conflict${viewConflictCount === 1 ? '' : 's'}`);
    return parts.join(' · ');
  }, [filteredBookings.length, filteredEnquiries.length, hallStatsByLocation, viewConflictCount]);

  const banquetIndex = useMemo(() => buildBanquetIndex(halls), [halls]);
  const hallBanquetById = useMemo(() => {
    const map = new Map<string, string>();
    halls.forEach((hall) => map.set(hall.id, (hall.banquetName || '').trim()));
    return map;
  }, [halls]);

  const monthLinesByDate = useMemo(() => {
    const map = new Map<string, MonthLine[]>();
    const push = (key: string, line: MonthLine) => {
      const bucket = map.get(key) || [];
      bucket.push(line);
      map.set(key, bucket);
    };
    bookingsByDate.forEach((rows, key) =>
      rows.forEach((entry) => {
        const hallId = entry.halls?.[0]?.hall?.id || entry.halls?.[0]?.hallId || '';
        push(key, {
          id: entry.id,
          kind: 'booking',
          title: entry.functionName,
          timeLabel: compactClock(entry.startTime || entry.functionTime) || '--',
          status: resolveBookingStatus(entry),
          banquetName: hallBanquetById.get(hallId) || undefined,
          sortMinutes: bookingSortMinutes(entry),
        });
      })
    );
    enquiriesByDate.forEach((rows, key) =>
      rows.forEach((entry) => {
        push(key, {
          id: entry.id,
          kind: 'enquiry',
          title: entry.functionName,
          timeLabel: compactClock(entry.functionTime) || '--',
          status: resolveEnquiryStatus(entry),
          banquetName: undefined,
          sortMinutes: entry.functionTime
            ? parseClockToMinutes(entry.functionTime)
            : Number.POSITIVE_INFINITY,
        });
      })
    );
    googleEventsByDate.forEach((rows, key) =>
      rows.forEach((entry) => {
        push(key, {
          id: entry.id,
          kind: 'google',
          title: entry.title,
          timeLabel: entry.isAllDay ? 'All day' : formatEventClock(entry.start),
          status: 'confirmed',
          banquetName: undefined,
          sortMinutes: googleEventSortMinutes(entry),
        });
      })
    );
    map.forEach((rows) => rows.sort((a, b) => a.sortMinutes - b.sortMinutes));
    return map;
  }, [bookingsByDate, enquiriesByDate, googleEventsByDate, hallBanquetById]);

  const sidebarGroups = useMemo<SidebarGroup[]>(
    () =>
      hallStatsByLocation.map(([banquetName, hallStatsRows]) => ({
        banquetName,
        halls: hallStatsRows.map((h) => ({ id: h.id, name: h.name, count: h.count })),
      })),
    [hallStatsByLocation]
  );

  const statusCounts = useMemo(() => {
    const keys = ['confirmed', 'pencil', 'quotation', 'enquiry', 'pending', 'cancelled'];
    const labels: Record<string, string> = {
      confirmed: 'Confirmed',
      pencil: 'Pencil',
      quotation: 'Quotation',
      enquiry: 'Enquiry',
      pending: 'Pending',
      cancelled: 'Cancelled',
    };
    const tally = new Map<string, number>();
    bookings.forEach((b) => {
      const s = resolveBookingStatus(b);
      tally.set(s, (tally.get(s) || 0) + 1);
    });
    enquiries.forEach((e) => {
      const s = resolveEnquiryStatus(e);
      tally.set(s, (tally.get(s) || 0) + 1);
    });
    return keys.map((key) => ({ key, label: labels[key], count: tally.get(key) || 0 }));
  }, [bookings, enquiries]);

  const daysWithEvents = useMemo(() => {
    const map = new Map<string, Set<number>>();
    monthLinesByDate.forEach((rows, key) => {
      const set = new Set<number>();
      rows.forEach((line) => {
        const idx = line.banquetName ? banquetIndex.get(line.banquetName) : undefined;
        if (idx !== undefined) set.add(idx);
      });
      map.set(key, set);
    });
    return map;
  }, [monthLinesByDate, banquetIndex]);

  const conflictIdsForSelectedDay = useMemo(() => {
    const set = new Set<string>();
    (conflictsByDate.get(selectedDate) || []).forEach((c) => {
      set.add(c.first.id);
      set.add(c.second.id);
    });
    return set;
  }, [conflictsByDate, selectedDate]);

  const conflictHallNames = useMemo(
    () => new Set((conflictsByDate.get(selectedDate) || []).map((c) => c.hallName)),
    [conflictsByDate, selectedDate]
  );

  const selectSlot = useCallback(
    (slot: HallBoardSlot, row: HallBoardRow) => {
      setSelectedEvent({
        kind: slot.source === 'google' ? 'google' : 'booking',
        id: slot.bookingId || slot.functionName,
        title: slot.functionName,
        kicker: `${row.banquetName || row.hallName} · ${row.hallName}`.toUpperCase(),
        status: slot.status,
        banquetName: row.rowType === 'googleVenue' ? undefined : row.banquetName || undefined,
        dateLabel: formatDateLongIN(parseDateKey(slot.date)),
        timeLabel: slot.timeLabel,
        customer: slot.customerName,
        guests: slot.guests,
        pencilExpiresAt: slot.pencilExpiresAt,
        source: slot.source,
        htmlLink: slot.htmlLink,
        conflict: slot.bookingId ? conflictIdsForSelectedDay.has(slot.bookingId) : false,
      });
    },
    [conflictIdsForSelectedDay]
  );

  const selectLine = useCallback(
    (line: MonthLine) => {
      if (line.kind === 'booking') {
        const entry = bookings.find((b) => b.id === line.id);
        if (!entry) return;
        setSelectedEvent({
          kind: 'booking',
          id: entry.id,
          title: entry.functionName,
          kicker: getPrimaryHallName(entry).toUpperCase(),
          status: resolveBookingStatus(entry),
          banquetName: line.banquetName,
          dateLabel: formatDateLongIN(new Date(entry.functionDate)),
          timeLabel: bookingTimeLabel(entry),
          customer: entry.customer?.name,
          guests: toSafeNumber(entry.expectedGuests) || undefined,
          revenue: toSafeNumber(entry.grandTotal) || undefined,
          pencilExpiresAt: entry.pencilExpiresAt,
          source: 'software',
          conflict: conflictIdsForSelectedDay.has(entry.id),
        });
      } else if (line.kind === 'enquiry') {
        const entry = enquiries.find((e) => e.id === line.id);
        if (!entry) return;
        setSelectedEvent({
          kind: 'enquiry',
          id: entry.id,
          title: entry.functionName,
          kicker: 'ENQUIRY',
          status: resolveEnquiryStatus(entry),
          dateLabel: formatDateLongIN(new Date(entry.functionDate)),
          timeLabel: formatClockDisplay(entry.functionTime) || '--:--',
          customer: entry.customer?.name,
          guests: toSafeNumber(entry.expectedGuests) || undefined,
          source: 'software',
          conflict: false,
        });
      } else {
        const entry = googleEvents.find((g) => g.id === line.id);
        if (!entry) return;
        setSelectedEvent({
          kind: 'google',
          id: entry.id,
          title: entry.title,
          kicker: entry.venueName.toUpperCase(),
          status: 'confirmed',
          dateLabel: formatDateLongIN(new Date(entry.start)),
          timeLabel: googleEventTimeLabel(entry),
          source: 'google',
          htmlLink: entry.htmlLink,
          conflict: false,
        });
      }
    },
    [bookings, enquiries, googleEvents, conflictIdsForSelectedDay]
  );

  const openSelected = useCallback(
    (event: SelectedEvent) => {
      setSelectedEvent(null);
      if (event.kind === 'booking') openBookingEdit(event.id);
      else if (event.kind === 'enquiry') openEnquiryDetails(event.id);
      else if (event.htmlLink) window.open(event.htmlLink, '_blank', 'noopener');
    },
    [openBookingEdit, openEnquiryDetails]
  );

  const shiftPeriod = useCallback(
    (delta: -1 | 1) => {
      setViewDate((prev) => {
        const next = new Date(prev);
        if (viewMode === 'month') next.setMonth(next.getMonth() + delta);
        else if (viewMode === 'week') next.setDate(next.getDate() + 7 * delta);
        else next.setDate(next.getDate() + delta);
        return next;
      });
    },
    [viewMode]
  );

  const goToday = useCallback(() => {
    const now = new Date();
    setViewDate(startOfDay(now));
    setSelectedDate(formatDateKey(now));
  }, []);

  const drillDay = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
    setViewDate(startOfDay(parseDateKey(dateKey)));
    setViewMode(isMobile ? 'month' : 'day');
  }, [isMobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      const isAnyDialogOpen = Boolean(document.querySelector('[role="dialog"]'));
      if (isAnyDialogOpen || isBookingFormOpen || isEventModalOpen) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        shiftPeriod(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        shiftPeriod(1);
      } else if (e.key === 't' || e.key === 'T') goToday();
      else if (e.key === 'm' || e.key === 'M') setCalendarViewMode('month');
      else if (e.key === 'w' || e.key === 'W') setCalendarViewMode('week');
      else if (e.key === 'd' || e.key === 'D') setCalendarViewMode('day');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shiftPeriod, goToday, setCalendarViewMode, isBookingFormOpen, isEventModalOpen]);

  return (
    <div
      className={`ncal-root ops-route ops-calendar-page min-w-0 max-w-full overflow-x-hidden${monthFit ? ' ncal-root--month-fit' : ''}`}
      style={{ display: 'flex', flexDirection: 'row', minHeight: 0, height: '100%' }}
    >
      {!isMobile && (
        <CalendarSidebar
          groups={sidebarGroups}
          banquetIndex={banquetIndex}
          selectedHallIds={selectedHallIds}
          toggleHall={toggleHall}
          toggleBanquetGroup={toggleBanquetGroup}
          statusCounts={statusCounts}
          selectedStatuses={selectedStatuses}
          toggleStatus={toggleStatus}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          stats={{
            venues: sidebarGroups.length,
            halls: halls.length,
            todayCount: (bookingsByDate.get(todayKey) || []).length,
          }}
          mini={{
            viewDate,
            viewMode,
            selectedDate,
            todayKey,
            busyDays: new Set(monthLinesByDate.keys()),
            onPickDay: drillDay,
            onMonthShift: (delta) =>
              setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)),
            onJumpToMonth: (next) => setViewDate(startOfDay(next)),
          }}
        />
      )}
      <div
        className="ncal-main"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <CalendarHeader
          title={viewLabel}
          subtitle={viewSubtitle}
          viewMode={viewMode}
          onViewMode={setCalendarViewMode}
          onToday={goToday}
          onShift={shiftPeriod}
          search={search}
          onSearch={setSearch}
          canAddBooking={canAddBooking}
          onNewBooking={() => openNewBooking()}
          showPrint={viewMode === 'day'}
          printing={printingDay}
          onPrint={handlePrintDay}
          loading={calendarQuery.isFetching}
          pickerOpen={pickerOpen}
          onTogglePicker={isMobile ? () => setPickerOpen((v) => !v) : undefined}
          onToggleFilters={isMobile ? () => setFilterSheetOpen(true) : undefined}
          mobile={isMobile}
        />

        {isMobile && (
          <>
            <div className={`ncal-cal-picker${pickerOpen ? '' : ' collapsed'}`}>
              <MiniCalendar
                viewDate={viewDate}
                viewMode={viewMode}
                selectedDate={selectedDate}
                todayKey={todayKey}
                busyDays={new Set(monthLinesByDate.keys())}
                onPickDay={(key) => {
                  setSelectedDate(key);
                  setViewDate(startOfDay(parseDateKey(key)));
                  setPickerOpen(false);
                }}
                onMonthShift={(delta) =>
                  setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
                }
                onJumpToMonth={(next) => setViewDate(startOfDay(next))}
              />
            </div>
            <div className="ncal-mtools">
              <input
                className="ncal-t-search"
                style={{ flex: 1, width: 'auto' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings…"
                aria-label="Search bookings"
              />
              <button
                type="button"
                className="ncal-t-btn"
                onClick={() => setFilterSheetOpen(true)}
                aria-label="Filters"
              >
                Filters
              </button>
            </div>
          </>
        )}

        {hallsQuery.isError && (
          <div
            role="alert"
            className="fade-in-soft flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            <span>Failed to load halls.</span>
            <button
              type="button"
              onClick={() => void hallsQuery.refetch()}
              className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900"
            >
              Retry
            </button>
          </div>
        )}

        {calendarQuery.isError && (
          <div
            role="alert"
            className="fade-in-soft flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            <span>Failed to load calendar data.</span>
            <button
              type="button"
              onClick={() => void calendarQuery.refetch()}
              className="rounded-full border border-red-300 bg-white px-2.5 py-0.5 text-xs font-semibold hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {!calendarQuery.isError && calendarLoadErrors.length > 0 && (
          <div
            role="alert"
            className="fade-in-soft flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            <span>
              Couldn&apos;t load {calendarLoadErrorLabel}. Showing available data.
            </span>
            <button
              type="button"
              onClick={() => void calendarQuery.refetch()}
              className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900"
            >
              Retry
            </button>
          </div>
        )}

        {!calendarQuery.isError && (bookingsTruncated || enquiriesTruncated) && (
          <div
            role="status"
            className="fade-in-soft flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            <span>
              Calendar data may be incomplete
              {bookingsTruncated && enquiriesTruncated
                ? ' (bookings and enquiries)'
                : bookingsTruncated
                  ? ' (bookings)'
                  : ' (enquiries)'}
              . Narrow the date range or contact support if counts look wrong.
            </span>
          </div>
        )}

        {viewConflictCount > 0 && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              {Array.from(new Set(selectedDayConflicts.map((c) => c.hallName))).map((hallName) => (
                <div key={hallName} className="font-semibold">
                  {hallName} has overlapping bookings on this date
                </div>
              ))}
              {otherConflictDates.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span>
                    {selectedDayConflicts.length > 0 ? 'Also on:' : 'Conflicts on:'}
                  </span>
                  {otherConflictDates.map((dateKey) => (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => handleJumpToDate(dateKey)}
                      className="rounded-full border border-red-300 bg-white px-2 py-0.5 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900"
                    >
                      {formatWeekdayDateIN(parseDateKey(dateKey), {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {searchQuery.length >= 2 && elsewhereHits.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60">
            <span className="font-medium text-slate-600 dark:text-slate-300">On other dates:</span>
            {elsewhereHits.map((hit) => (
              <button
                key={`${hit.type}:${hit.id}`}
                type="button"
                onClick={() => handleJumpToDate(dateToKey(hit.functionDate!))}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs hover:border-teal-400 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:hover:text-teal-300"
              >
                <span className="font-medium">{hit.label}</span>
                {hit.secondary && <span className="text-slate-500">· {hit.secondary}</span>}
                <span className="text-slate-500">
                  ·{' '}
                  {formatWeekdayDateIN(hit.functionDate!, {
                    day: 'numeric',
                    month: 'short',
                    withYear: true,
                  })}
                </span>
              </button>
            ))}
          </div>
        )}

        <div
          className={`ncal-board${showStaleOverlay ? ' stale' : ''}`}
          aria-busy={showStaleOverlay || loading}
        >
          {loading ? (
            <CalendarPageSkeleton />
          ) : (
            <>
              {viewMode === 'month' && !isMobile && (
                <MonthBoard
                  viewDate={viewDate}
                  todayKey={todayKey}
                  linesByDate={monthLinesByDate}
                  banquetIndex={banquetIndex}
                  onDrillDay={drillDay}
                  onLineClick={selectLine}
                  fitViewport={monthFit}
                />
              )}
              {viewMode === 'month' && isMobile && (
                <MobileMonthAgenda
                  viewDate={viewDate}
                  selectedDate={selectedDate}
                  todayKey={todayKey}
                  daysWithEvents={daysWithEvents}
                  agenda={monthLinesByDate.get(selectedDate) ?? []}
                  banquetIndex={banquetIndex}
                  onPickDay={(key) => {
                    setSelectedDate(key);
                    setViewDate(startOfDay(parseDateKey(key)));
                  }}
                  onEventClick={selectLine}
                />
              )}
              {viewMode === 'week' && (
                <WeekBoard
                  weekDays={weekDays}
                  todayKey={todayKey}
                  rows={hallBoardRows}
                  banquetIndex={banquetIndex}
                  onDrillDay={drillDay}
                  onSlotClick={selectSlot}
                />
              )}
              {viewMode === 'day' && (
                <DayTimelineBoard
                  dateKey={selectedDate}
                  isToday={selectedDate === todayKey}
                  rows={hallBoardRows}
                  banquetIndex={banquetIndex}
                  conflictHallNames={conflictHallNames}
                  onSlotClick={selectSlot}
                />
              )}
            </>
          )}
        </div>

        <EventDetailPanel
          open={isEventModalOpen}
          event={selectedEvent}
          banquetIndex={banquetIndex}
          canEditBooking={canEditBooking}
          onClose={() => setSelectedEvent(null)}
          onOpen={openSelected}
        />

        {isMobile && (
          <MobileFilterSheet
            open={filterSheetOpen}
            onClose={() => setFilterSheetOpen(false)}
            groups={sidebarGroups}
            banquetIndex={banquetIndex}
            selectedHallIds={selectedHallIds}
            toggleHall={toggleHall}
            toggleBanquetGroup={toggleBanquetGroup}
            statusCounts={statusCounts}
            selectedStatuses={selectedStatuses}
            toggleStatus={toggleStatus}
          />
        )}

        {isMobile && canAddBooking && (
          <button
            type="button"
            className={`ncal-fab${selectedEvent || filterSheetOpen || isBookingFormOpen ? ' hidden' : ''}`}
            onClick={() => openNewBooking({ date: selectedDate })}
            aria-label={CTA_NEW_BOOKING}
          >
            <Plus size={16} aria-hidden="true" /> New
          </button>
        )}

        <DayPrintView selectedDateLabel={selectedDateLabel} printBookings={printBookings} />
      </div>

      <BookingFormModal {...bookingForm} />
    </div>
  );
}

export default function CalendarPage() {
  return <CalendarPageContent />;
}
