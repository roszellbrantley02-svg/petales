import { Suspense } from 'react';
import SetPasswordClient from './SetPasswordClient';

export const metadata = {
  title: 'Set your password · Petales',
};

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordClient />
    </Suspense>
  );
}
