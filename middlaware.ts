// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = {
  // Você pode gerar esse JSON no Firebase: Configuração do SDK Admin
  // OU usar variáveis de ambiente em produção.
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount as any) });
}

const auth = getAuth();

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('__session')?.value;

  const url = req.nextUrl.clone();
  const pathname = req.nextUrl.pathname;

  if (!token) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  try {
    const decoded = await auth.verifySessionCookie(token, true);
    const role = decoded.role;

    // Proteção de rota por tipo de usuário
    if (pathname.startsWith('/caixa') && role !== 'caixa') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/cozinha/1') && role !== 'cozinha1') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/cozinha/2') && role !== 'cozinha2') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/admin') && role !== 'admin') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } catch (err) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Quais rotas devem passar pelo middleware
export const config = {
  matcher: ['/caixa/:path*', '/cozinha1/:path*', '/admin/:path*','/cozinha2/:path*','/salao/:path*'],
};
