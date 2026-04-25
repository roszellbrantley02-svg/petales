// ——————————————————————————————————————————————————
// Auth middleware — protects /home routes.
//
// Anyone trying to reach /home or /home/* without a valid session
// gets bounced to /signin. The family-side pages (/p/*) and landing
// page (/) stay public.
// ——————————————————————————————————————————————————

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Only protect /home and its subroutes
  if (!path.startsWith('/home')) {
    return NextResponse.next();
  }

  // Build a Supabase client with cookies attached to the response
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session and check auth
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not signed in → redirect to /signin with a "next" param
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/home/:path*'],
};
