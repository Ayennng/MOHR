/* eslint-disable @next/next/no-img-element -- avatars come from our authenticated /api/files route, which next/image can't fetch */

/** Small round avatar: the picture if there is one, else the name's initials on mint. */
export default function AvatarDisplay({ avatar, name }: { avatar?: string | null; name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-mint-200 text-xs font-semibold text-mint-900">
      {avatar ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
