import SignInClient from './SignInClient';

export const metadata = {
  title: 'Sign in · Petales',
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <SignInPageInner searchParams={searchParams} />;
}

async function SignInPageInner({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <SignInClient next={params.next || '/home'} />;
}
