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
    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-mint-200 text-xs font-bold text-mint-900">
      {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}
