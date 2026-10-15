'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, MapPin, Users, Clock } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

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
  roomId: string;
  roomName: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO instant
  endTime: string; // ISO instant
  purpose: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

const emptyBooking = { date: '', startTime: '', endTime: '', purpose: '' };
const emptyRoom = { name: '', capacity: '', location: '', amenities: '' };

const inputClass = 'w-full px-4 py-2 border border-moss-200 rounded-lg';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return body.error || fallback;
}

export default function RoomsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSaving, setBookingSaving] = useState(false);

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomSaving, setRoomSaving] = useState(false);

  const loadData = async () => {
    const [roomsRes, bookingsRes] = await Promise.all([fetch('/api/rooms'), fetch('/api/bookings')]);
    if (!roomsRes.ok || !bookingsRes.ok) throw new Error('Failed to load rooms');
    setRooms(await roomsRes.json());
    setBookings(await bookingsRes.json());
  };

  useEffect(() => {
    loadData()
      .catch((error) => {
        console.error('Failed to fetch data:', error);
        setLoadError('Could not load rooms. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []);

  const openBooking = (room: Room) => {
    setSelectedRoom(room);
    setBookingForm(emptyBooking);
    setBookingError(null);
  };

  const closeBooking = () => {
    setSelectedRoom(null);
    setBookingError(null);
  };

  const handleBookRoom = async () => {
    if (!selectedRoom) return;
    const { date, startTime, endTime, purpose } = bookingForm;
    if (!date || !startTime || !endTime || !purpose.trim()) {
      setBookingError('Please fill in the date, times and purpose.');
      return;
    }
    if (endTime <= startTime) {
      setBookingError('End time must be after start time.');
      return;
    }

    try {
      setBookingSaving(true);
      setBookingError(null);
      const response = await fetch('/api/rooms/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoom.id, ...bookingForm }),
      });
      if (!response.ok) throw new Error(await readError(response, 'Failed to book room'));

      await loadData();
      closeBooking();
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Failed to book room');
    } finally {
      setBookingSaving(false);
    }
  };

  const handleAddRoom = async () => {
    try {
      setRoomSaving(true);
      setRoomError(null);
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomForm.name,
          capacity: Number(roomForm.capacity),
          location: roomForm.location,
          amenities: roomForm.amenities.split(',').map((a) => a.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error(await readError(response, 'Failed to add room'));

      await loadData();
      setShowAddRoom(false);
      setRoomForm(emptyRoom);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to add room');
    } finally {
      setRoomSaving(false);
    }
  };

  const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED');

  return (
    <div className="space-y-8">
      {/* Header - Enhanced */}
      <div className="p-8 rounded-3xl bg-linear-to-br from-moss-50 to-emerald-50 border-2 border-moss-100 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-block px-4 py-2 bg-moss-600 text-white rounded-full text-xs font-bold mb-3">
            FACILITIES MANAGEMENT
          </div>
          <h1 className="text-5xl font-extrabold bg-linear-to-r from-moss-900 to-moss-700 bg-clip-text text-transparent mb-3 pb-2">
            Room Booking
          </h1>
          <p className="text-moss-800 text-lg">Book meeting rooms and conference facilities</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setRoomError(null); setShowAddRoom(true); }}>
            <Plus size={16} />
            Add Room
          </Button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{loadError}</div>
      )}

      {/* Rooms Grid */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-extrabold text-moss-900 flex items-center gap-3">
            <span className="w-2 h-8 bg-linear-to-b from-moss-500 to-moss-700 rounded-full"></span>
            Rooms
          </h2>
          <span className="text-sm text-moss-900 bg-moss-100 px-5 py-2.5 rounded-full font-bold border-2 border-moss-200">
            {rooms.filter((r) => r.bookable && !r.inUseNow).length} Free Now
          </span>
        </div>

        {!loading && rooms.length === 0 && !loadError && (
          <p className="text-moss-600">
            No rooms yet.{isAdmin ? ' Use "Add Room" to create one.' : ' Ask an administrator to add rooms.'}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`group relative overflow-hidden rounded-3xl transition-all duration-300 ${
                room.bookable
                  ? 'bg-white border-2 border-moss-100 shadow-lg hover:shadow-2xl hover:-translate-y-3'
                  : 'bg-gray-50 border-2 border-gray-200 opacity-60'
              }`}
            >
              <div className="relative p-7 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-moss-900">{room.name}</h3>
                    <p className="text-xs text-moss-600 mt-1 flex items-center gap-1">
                      <MapPin size={14} />
                      {room.location}
                    </p>
                  </div>
                  {room.bookable && (
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                        room.inUseNow ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {room.inUseNow ? 'In use' : '✓ Free now'}
                    </span>
                  )}
                </div>

                {/* Capacity */}
                <div className="pt-2 border-t border-moss-100">
                  <div className="flex items-center gap-3 p-3 bg-moss-50 rounded-xl">
                    <div className="p-2 bg-white rounded-lg">
                      <Users size={18} className="text-moss-600" />
                    </div>
                    <div>
                      <p className="text-xs text-moss-600 font-medium">Capacity</p>
                      <p className="text-sm font-bold text-moss-900">{room.capacity} people</p>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                {room.amenities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-moss-800 mb-2 uppercase tracking-wide">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {room.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="text-xs bg-linear-to-r from-moss-100 to-moss-200 text-moss-900 px-3 py-1.5 rounded-full font-semibold border border-moss-300"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {room.bookable ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2 bg-linear-to-r from-moss-500 to-moss-600 hover:from-moss-600 hover:to-moss-700"
                    onClick={() => openBooking(room)}
                  >
                    <Plus size={16} />
                    Book Room
                  </Button>
                ) : (
                  <div className="pt-2 p-3 bg-red-50 rounded-xl text-center">
                    <p className="text-sm font-semibold text-red-600">Out of service</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Bookings */}
      <div className="bg-white rounded-2xl border border-moss-100 p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-moss-900">My Bookings</h2>
          <p className="text-sm text-moss-600 mt-2">
            {activeBookings.length} upcoming {activeBookings.length === 1 ? 'booking' : 'bookings'}
          </p>
        </div>

        {activeBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-moss-50 rounded-full mb-4">
              <Clock className="text-moss-600" size={32} />
            </div>
            <p className="text-moss-600 font-medium">No upcoming bookings</p>
            <p className="text-sm text-moss-500 mt-1">Book a room to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeBookings.map((booking) => (
              <div
                key={booking.id}
                className="group relative overflow-hidden rounded-xl border border-moss-100 bg-linear-to-r from-moss-50/50 to-transparent p-4 hover:shadow-md hover:border-moss-200 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-moss-900">{booking.roomName}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-moss-600">
                      <span className="flex items-center gap-1 font-medium">
                        📅 {new Date(`${booking.date}T00:00:00Z`).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          timeZone: 'UTC',
                        })}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Clock size={14} />
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </span>
                      <span className="text-xs bg-moss-100 px-2 py-1 rounded-full">{booking.purpose}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-4 py-2 rounded-full shrink-0 ${
                      booking.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {booking.status === 'CONFIRMED' ? '✓ Confirmed' : '⏳ ' + booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={!!selectedRoom}
        onClose={closeBooking}
        title={`Book ${selectedRoom?.name ?? ''}`}
        size="md"
      >
        <div className="space-y-4">
          {bookingError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {bookingError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-moss-900 mb-1">Date</label>
            <input
              type="date"
              value={bookingForm.date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-moss-900 mb-1">Start Time</label>
              <input
                type="time"
                value={bookingForm.startTime}
                onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-moss-900 mb-1">End Time</label>
              <input
                type="time"
                value={bookingForm.endTime}
                onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-moss-900 mb-1">Purpose</label>
            <textarea
              value={bookingForm.purpose}
              onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
              className={inputClass}
              rows={3}
              maxLength={200}
              placeholder="Meeting purpose or agenda"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="ghost" onClick={closeBooking}>
            Cancel
          </Button>
          <Button onClick={handleBookRoom} isLoading={bookingSaving}>
            Confirm Booking
          </Button>
        </div>
      </Modal>

      {/* Add Room Modal (admins) */}
      <Modal isOpen={showAddRoom} onClose={() => setShowAddRoom(false)} title="Add Room" size="md">
        <div className="space-y-4">
          {roomError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {roomError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-moss-900 mb-1">Name</label>
            <input
              value={roomForm.name}
              onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
              className={inputClass}
              placeholder="Conference Room A"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-moss-900 mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                className={inputClass}
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-moss-900 mb-1">Location</label>
              <input
                value={roomForm.location}
                onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                className={inputClass}
                placeholder="Level 3"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-moss-900 mb-1">
              Amenities (comma-separated)
            </label>
            <input
              value={roomForm.amenities}
              onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
              className={inputClass}
              placeholder="Projector, Whiteboard"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="ghost" onClick={() => setShowAddRoom(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddRoom} isLoading={roomSaving}>
            Add Room
          </Button>
        </div>
      </Modal>
    </div>
  );
}
