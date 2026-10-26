import { redirect } from 'next/navigation';

// proxy.ts has already sent signed-out visitors to /login
export default function Home() {
  redirect('/dashboard');
}
