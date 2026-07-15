export interface BookingCalendarRow {
  id: string;
  functionName: string;
  functionType: string;
  functionDate: string;
  functionTime: string;
  startTime?: string | null;
  endTime?: string | null;
  expectedGuests: number;
  grandTotal: number;
  finalAmountValue?: number | null;
  paymentReceived?: number | string | null;
  paymentReceivedAmountValue?: number | null;
  paymentReceivedAmount?: string | number | null;
  dueAmount?: number | string | null;
  dueAmountValue?: number | null;
  versionNumber?: number | null;
  status: string;
  isQuotation: boolean;
  isPencilBooking?: boolean;
  pencilExpiresAt?: string | null;
  halls?: Array<{
    hallId?: string;
    hall?: {
      id: string;
      name: string;
    } | null;
  }>;
  customer?: {
    name: string;
    phone: string;
  } | null;
}

export interface EnquiryCalendarRow {
  id: string;
  functionName: string;
  functionType: string;
  functionDate: string;
  functionTime?: string | null;
  expectedGuests: number;
  status: string;
  quotationSent?: boolean;
  isPencilBooked?: boolean;
  customer?: {
    name: string;
    phone: string;
  } | null;
}

export interface AgendaEntry {
  id: string;
  kind: 'booking' | 'enquiry' | 'google';
  date: string;
  title: string;
  subtitle: string;
  status: string;
  amount?: number;
  source: 'software' | 'google';
}

export type CalendarViewMode = 'month' | 'week' | 'day';
export type CalendarDisplayMode = 'calendar' | 'hallBoard';

export interface HallCalendarOption {
  id: string;
  name: string;
  banquetName?: string;
}

export interface HallScheduleParty {
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  status: string;
  customerName: string;
  customerPhone: string;
  guests: number;
  sortMinutes: number;
  startMinutes: number;
  endMinutes: number;
}

export interface HallScheduleGroup {
  hallName: string;
  parties: HallScheduleParty[];
}

export interface BookingDetail {
  id: string;
  functionName: string;
  functionType?: string | null;
  functionDate: string;
  functionTime?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  expectedGuests?: number | null;
  grandTotal?: number | null;
  status?: string | null;
  isQuotation?: boolean;
  isPencilBooking?: boolean;
  pencilExpiresAt?: string | null;
  notes?: string | null;
  customer?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  halls?: Array<{
    hall?: {
      id?: string | null;
      name?: string | null;
    } | null;
  }>;
  packs?: Array<{
    id: string;
    packName?: string | null;
    mealSlot?: {
      name?: string | null;
    } | null;
    startTime?: string | null;
    endTime?: string | null;
    packCount?: number | null;
    noOfPack?: number | null;
  }>;
  additionalItems?: Array<{
    description?: string | null;
  }>;
  payments?: Array<{
    id: string;
    amount?: number | null;
    paymentDate?: string | null;
    method?: string | null;
    narration?: string | null;
    receiver?: {
      name?: string | null;
    } | null;
  }>;
}

export interface DayEvent {
  id: string;
  kind: 'booking' | 'enquiry' | 'google';
  title: string;
  time: string;
  subtitle: string;
  status: string;
  amount?: number;
  sortMinutes: number;
  bookingId?: string;
  source: 'software' | 'google';
}

export interface GoogleCalendarEventRow {
  id: string;
  googleEventId: string;
  calendarId: string;
  venueName: string;
  title: string;
  description?: string;
  location?: string;
  status: string;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink?: string;
  origin: 'software' | 'google';
}

export interface GoogleCalendarFetchResult {
  enabled: boolean;
  configured: boolean;
  sourceCount: number;
  events: GoogleCalendarEventRow[];
}

export type EventSourceFilter = 'all' | 'software' | 'google';

export interface HallBoardSlot {
  bookingId?: string;
  date: string;
  timeLabel: string;
  functionName: string;
  functionType?: string;
  customerName?: string;
  guests?: number;
  location?: string;
  status: string;
  sortKey: number;
  startMinutes: number;
  endMinutes: number;
  isPencilBooking?: boolean;
  pencilExpiresAt?: string | null;
  source: 'software' | 'google';
  htmlLink?: string;
}

export interface HallBoardRow {
  hallId?: string;
  hallName: string;
  banquetName?: string;
  rowType?: 'hall' | 'googleVenue';
  slots: HallBoardSlot[];
}

export interface MobileTimelineEntry {
  id: string;
  kind: 'booking' | 'enquiry' | 'google';
  title: string;
  subtitle: string;
  timeLabel: string;
  top: number;
  height: number;
  borderColor: string;
  background: string;
  textColor: string;
  source: 'software' | 'google';
  bookingId?: string;
  enquiryId?: string;
}

export type ServiceSlot = 'breakfast' | 'lunch' | 'hiTea' | 'dinner';
