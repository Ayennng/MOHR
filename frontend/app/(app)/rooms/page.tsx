'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, MapPin, Users, Clock, Calendar } from 'lucide-react';
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
  return (
    <div
      className={`group flex flex-col gap-5 rounded-card border border-mint-900/8 p-6 transition-[transform,box-shadow] duration-200 ease-out-soft ${
        room.bookable ? 'bg-white shadow-soft hover:-translate-y-1 hover:shadow-lift' : 'bg-stone-50 opacity-70'
      }`}
    >
      <div>
        {room.bookable && (
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              room.inUseNow ? 'bg-amber-100 text-amber-800' : 'bg-mint-100 text-mint-800'
            }`}
          >
            <span aria-hidden className={`size-1.5 rounded-full ${room.inUseNow ? 'bg-amber-500' : 'bg-mint-500'}`} />
            {room.inUseNow ? 'In use' : 'Free now'}
          </span>
        )}
        <h3 className="mt-3 text-lg font-bold text-mint-950">{room.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-mint-700">
          <MapPin size={14} />
          {room.location}
        </p>
      </div>

      <p className="flex items-center gap-2 text-sm font-semibold text-mint-900">
        <span className="grid size-8 place-items-center rounded-xl bg-mint-100 text-mint-800">
          <Users size={16} />
        </span>
        Seats {room.capacity}
      </p>

      {room.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {room.amenities.map((amenity) => (
            <span key={amenity} className="rounded-full border border-mint-900/10 px-2.5 py-1 text-xs font-medium text-mint-800">
              {amenity}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto">
        {room.bookable ? (
          <Button size="sm" variant="secondary" className="w-full" onClick={onBook}>
            <Plus size={16} />
            Book Room
          </Button>
        ) : (
          <p className="rounded-full bg-stone-100 py-1.5 text-center text-sm font-semibold text-stone-700">Out of service</p>
        )}
      </div>
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
        eyebrow="Facilities"
        title="Room Booking"
        description="Book meeting rooms and conference facilities"
        action={
          isAdmin && (
            <Button size="lg" onClick={() => setAddingRoom(true)}>
              <Plus size={20} />
              Add Room
            </Button>
          )
        }
      />

      {(rooms.error || bookings.error) && <Alert>Could not load rooms. Please refresh the page.</Alert>}

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <SectionTitle>Rooms</SectionTitle>
          <span className="rounded-full bg-mint-200 px-4 py-1.5 text-sm font-semibold text-mint-900">
            {roomList.filter((r) => r.bookable && !r.inUseNow).length} Free Now
          </span>
        </div>

        {!rooms.loading && roomList.length === 0 && !rooms.error && (
          <p className="text-mint-700">
            No rooms yet.{isAdmin ? ' Use "Add Room" to create one.' : ' Ask an administrator to add rooms.'}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
          {roomList.map((room) => (
            <RoomCard key={room.id} room={room} onBook={() => openBooking(room)} />
          ))}
        </div>
      </section>

      <Card
        title="My Bookings"
        description={`${myBookings.length} upcoming ${myBookings.length === 1 ? 'booking' : 'bookings'}`}
      >
        {myBookings.length === 0 ? (
          <div className="text-center py-12 text-mint-700">
            <Clock className="mx-auto mb-4" size={32} />
            <p className="font-medium">No upcoming bookings</p>
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {myBookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-mint-900/8 p-4 transition-colors duration-200 hover:bg-mint-50">
                <h3 className="font-semibold text-mint-950">{b.roomName}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-mint-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(b.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatTime(b.startTime)} - {formatTime(b.endTime)}
                  </span>
                  <span className="rounded-full bg-mint-100 px-2.5 py-0.5 text-xs text-mint-900">{b.purpose}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={!!bookingRoom} onClose={() => setBookingRoom(null)} title={`Book ${bookingRoom?.name ?? ''}`}>
        <div className="space-y-4">
          <Alert>{booking.error}</Alert>
          <Field label="Date">
            <input type="date" min={new Date().toISOString().slice(0, 10)} {...booking.bind('date')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Time">
              <input type="time" {...booking.bind('startTime')} />
            </Field>
            <Field label="End Time">
              <input type="time" {...booking.bind('endTime')} />
            </Field>
          </div>
          <Field label="Purpose">
            <textarea rows={3} maxLength={200} placeholder="Meeting purpose or agenda" {...booking.bind('purpose')} />
          </Field>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setBookingRoom(null)}>
            Cancel
          </Button>
          <Button onClick={handleBook} isLoading={booking.saving}>
            Confirm Booking
          </Button>
        </ModalActions>
      </Modal>

      <Modal isOpen={addingRoom} onClose={() => setAddingRoom(false)} title="Add Room">
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
          <Field label="Amenities (comma-separated)">
            <input placeholder="Projector, Whiteboard" {...newRoom.bind('amenities')} />
          </Field>
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setAddingRoom(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddRoom} isLoading={newRoom.saving}>
            Add Room
          </Button>
        </ModalActions>
      </Modal>
    </>
  );
}
