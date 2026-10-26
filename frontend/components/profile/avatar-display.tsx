/* eslint-disable @next/next/no-img-element -- avatars come from our authenticated /api/files route, which next/image can't fetch */

/** Small rounded avatar: the picture if there is one, else the name's initials. */
export default function AvatarDisplay({ avatar, name }: { avatar?: string | null; name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-10 h-10 shrink-0 rounded-xl bg-linear-to-br from-moss-400 to-moss-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden shadow-sm">
      {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
