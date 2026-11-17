'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, MapPin, Users, CalendarX } from 'lucide-react';
import { api, useApi } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/format';
import { Alert, Button, Card, Field, Modal, ModalActions, PageHeader, SectionTitle, inputClass } from '@/components/ui';

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  bookable: boolean; // room is not out of service
  inUseNow: boolean; // a booking is in progress right now
}

interface Booking {
  id: string;
  roomName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO instant
  endTime: string; // ISO instant
  purpose: string;
}

const emptyBooking = { date: '', startTime: '', endTime: '', purpose: '' };
const emptyRoom = { name: '', capacity: '', location: '', amenities: '' };

/** State for a modal form: its values, whether it's saving, and the last error. */
function useFormState<T>(empty: T) {
  const [values, setValues] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bind = (field: keyof T) => ({
    value: String(values[field]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [field]: e.target.value }),
    className: inputClass,
  });

  /** Runs `action`; returns whether it succeeded, keeping its error message if not. */
  const submit = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setValues(empty);
    setError(null);
  };

  return { values, error, setError, saving, bind, submit, reset };
}

function RoomCard({ room, onBook }: { room: Room; onBook: () => void }) {
  const status = !room.bookable
    ? { dot: 'bg-ink-300', text: 'Out of service' }
    : room.inUseNow
      ? { dot: 'bg-amber-500', text: 'In use' }
      : { dot: 'bg-mint-500', text: 'Free now' };

  return (
    <div
      className={`flex flex-col rounded-card border p-5 transition-colors duration-150 ${
        room.bookable ? 'border-ink-900/8 bg-white shadow-soft hover:border-ink-900/16' : 'border-ink-900/6 bg-ink-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className={`text-base font-semibold ${room.bookable ? 'text-ink-900' : 'text-ink-500'}`}>{room.name}</h3>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[13px] text-ink-600">
          <span aria-hidden className={`size-1.5 rounded-full ${status.dot}`} />
          {status.text}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} />
          {room.location}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Users size={14} />
          {room.capacity} seats
        </span>
      </div>

      {room.amenities.length > 0 && <p className="mt-3 text-[13px] text-ink-600">{room.amenities.join(' · ')}</p>}

      {room.bookable && (
        <div className="mt-auto pt-5">
          <Button size="sm" variant="outline" className="w-full" onClick={onBook}>
            Book
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RoomsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const rooms = useApi<Room[]>('/api/rooms');
  const bookings = useApi<Booking[]>('/api/bookings');
  const reload = () => {
    rooms.reload();
    bookings.reload();
  };

  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const booking = useFormState(emptyBooking);
  const [addingRoom, setAddingRoom] = useState(false);
  const newRoom = useFormState(emptyRoom);

  const openBooking = (room: Room) => {
    booking.reset();
    setBookingRoom(room);
  };

  const handleBook = async () => {
    const { date, startTime, endTime, purpose } = booking.values;
    if (!bookingRoom) return;
    if (!date || !startTime || !endTime || !purpose.trim()) return booking.setError('Please fill in the date, times and purpose.');
    if (endTime <= startTime) return booking.setError('End time must be after start time.');

    const ok = await booking.submit(() =>
      api('/api/rooms/book', { method: 'POST', json: { roomId: bookingRoom.id, ...booking.values } })
    );
    if (ok) {
      setBookingRoom(null);
      reload();
    }
  };

  const handleAddRoom = async () => {
    const { name, capacity, location, amenities } = newRoom.values;
    const ok = await newRoom.submit(() =>
      api('/api/rooms', {
        method: 'POST',
        json: {
          name,
          capacity: Number(capacity),
          location,
          amenities: amenities.split(',').map((a) => a.trim()).filter(Boolean),
        },
      })
    );
    if (ok) {
      setAddingRoom(false);
      newRoom.reset();
      rooms.reload();
    }
  };

  const roomList = rooms.data ?? [];
  const myBookings = bookings.data ?? [];

  return (
    <>
      <PageHeader
        title="Room booking"
        description="See which rooms are free and reserve one for a meeting"
        action={
          isAdmin && (
            <Button onClick={() => setAddingRoom(true)}>
              <Plus size={16} />
              Add room
            </Button>
          )
        }
      />

      {(rooms.error || bookings.error) && <Alert>Could not load rooms. Please refresh the page.</Alert>}

      <section className="space-y-3">
        <SectionTitle
          description={
            rooms.data
              ? `${roomList.filter((r) => r.bookable && !r.inUseNow).length} of ${roomList.length} free right now`
              : ' '
          }
        >
          Rooms
        </SectionTitle>

        {!rooms.loading && roomList.length === 0 && !rooms.error && (
          <p className="text-[15px] text-ink-600">
            No rooms yet.{isAdmin ? ' Use Add room to create one.' : ' Ask an administrator to add rooms.'}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger">
          {roomList.map((room) => (
            <RoomCard key={room.id} room={room} onBook={() => openBooking(room)} />
          ))}
        </div>
      </section>

      <Card
        title="My bookings"
        description={`${myBookings.length} upcoming ${myBookings.length === 1 ? 'booking' : 'bookings'}`}
      >
        {myBookings.length === 0 ? (
          <div className="py-10 text-center text-ink-500">
            <CalendarX className="mx-auto mb-3 text-ink-300" size={24} />
            <p className="text-sm">No upcoming bookings</p>
          </div>
        ) : (
          <ul className="-my-3 divide-y divide-ink-900/6">
            {myBookings.map((b) => (
              <li key={b.id} className="flex items-center gap-4 py-3">
                <div className="grid w-12 shrink-0 rounded-xl border border-ink-900/8 bg-ink-50 py-1.5 text-center leading-tight">
                  <span className="text-[11px] text-ink-500">{formatDate(b.date, { weekday: 'short' })}</span>
                  <span className="font-display text-lg font-medium tabular-nums text-ink-900">
                    {formatDate(b.date, { day: 'numeric' })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{b.roomName}</p>
                  <p className="mt-0.5 truncate text-[13px] text-ink-500">
                    <span className="tabular-nums">
                      {formatDate(b.date, { month: 'short', day: 'numeric' })}, {formatTime(b.startTime)}–{formatTime(b.endTime)}
                    </span>
                    <span className="text-ink-300"> · </span>
                    {b.purpose}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={!!bookingRoom} onClose={() => setBookingRoom(null)} title={`Book ${bookingRoom?.name ?? ''}`}>
        <div className="space-y-4">
          <Alert>{booking.error}</Alert>
          <Field label="Date">
            <input type="date" min={new Date().toISOString().slice(0, 10)} {...booking.bind('date')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start time">
              <input type="time" {...booking.bind('startTime')} />
            </Field>
            <Field label="End time">
              <input type="time" {...booking.bind('endTime')} />
            </Field>
          </div>
          <Field label="Purpose">
            <textarea rows={3} maxLength={200} placeholder="What the meeting is for" {...booking.bind('purpose')} />
          </Field>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setBookingRoom(null)}>
            Cancel
          </Button>
          <Button onClick={handleBook} isLoading={booking.saving}>
            Confirm booking
          </Button>
        </ModalActions>
      </Modal>

      <Modal isOpen={addingRoom} onClose={() => setAddingRoom(false)} title="Add room">
        <div className="space-y-4">
          <Alert>{newRoom.error}</Alert>
          <Field label="Name">
            <input placeholder="Conference Room A" {...newRoom.bind('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Capacity">
              <input type="number" min={1} placeholder="10" {...newRoom.bind('capacity')} />
            </Field>
            <Field label="Location">
              <input placeholder="Level 3" {...newRoom.bind('location')} />
            </Field>
          </div>
          <Field label="Amenities" hint="Separate with commas">
            <input placeholder="Projector, Whiteboard" {...newRoom.bind('amenities')} />
          </Field>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setAddingRoom(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddRoom} isLoading={newRoom.saving}>
            Add room
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
