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
      className={`rounded-3xl p-7 space-y-5 border-2 transition-all duration-300 ${
        room.bookable
          ? 'bg-white border-moss-100 shadow-lg hover:shadow-2xl hover:-translate-y-2'
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg text-moss-900">{room.name}</h3>
          <p className="text-xs text-moss-600 mt-1 flex items-center gap-1">
            <MapPin size={14} />
            {room.location}
          </p>
        </div>
        {room.bookable && (
          <span
            className={`shrink-0 px-3 py-1 text-xs font-bold rounded-full ${
              room.inUseNow ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
            }`}
          >
            {room.inUseNow ? 'In use' : 'Free now'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 bg-moss-50 rounded-xl">
        <Users size={18} className="text-moss-600" />
        <p className="text-sm font-bold text-moss-900">{room.capacity} people</p>
      </div>

      {room.amenities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {room.amenities.map((amenity) => (
            <span key={amenity} className="text-xs bg-moss-100 text-moss-900 px-3 py-1.5 rounded-full font-semibold border border-moss-300">
              {amenity}
            </span>
          ))}
        </div>
      )}

      {room.bookable ? (
        <Button size="sm" className="w-full" onClick={onBook}>
          <Plus size={16} />
          Book Room
        </Button>
      ) : (
        <p className="p-3 bg-red-50 rounded-xl text-center text-sm font-semibold text-red-600">Out of service</p>
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
          <span className="text-sm text-moss-900 bg-moss-100 px-5 py-2.5 rounded-full font-bold border-2 border-moss-200">
            {roomList.filter((r) => r.bookable && !r.inUseNow).length} Free Now
          </span>
        </div>

        {!rooms.loading && roomList.length === 0 && !rooms.error && (
          <p className="text-moss-600">
            No rooms yet.{isAdmin ? ' Use "Add Room" to create one.' : ' Ask an administrator to add rooms.'}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="text-center py-12 text-moss-600">
            <Clock className="mx-auto mb-4" size={32} />
            <p className="font-medium">No upcoming bookings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myBookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-moss-100 bg-linear-to-r from-moss-50/50 to-transparent p-4">
                <h3 className="font-semibold text-moss-900">{b.roomName}</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-moss-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {formatDate(b.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatTime(b.startTime)} - {formatTime(b.endTime)}
                  </span>
                  <span className="text-xs bg-moss-100 px-2 py-1 rounded-full">{b.purpose}</span>
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
