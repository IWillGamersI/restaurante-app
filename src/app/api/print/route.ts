// src/app/api/print/route.ts
import { NextRequest, NextResponse } from 'next/server';
import escpos from 'escpos';
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas no servidor
if (!admin.apps.length) {
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error('Variáveis de ambiente do Firebase não configuradas');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  console.log('✅ Firebase Admin inicializado com sucesso!');
}

export async function POST(req: NextRequest) {
  try {
    // Verifica header de autorização
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verifica role do usuário
    const userDoc = await admin.firestore().collection('usuarios').doc(decodedToken.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : null;

    if (role !== 'admin' && role !== 'loja') {
      return NextResponse.json({ error: 'Usuário não autorizado' }, { status: 403 });
    }

    // Dados do pedido
    const { pedido, vias = 1 } = await req.json();
    const Network = require('escpos-network');
    const device = new Network('192.168.1.100', 9100);
    const printer = new escpos.Printer(device);

    const imprimiPedido = async () => {
      printer.align('ct');
      printer.text('Top pizzas')
      printer.style('b').size(1, 1).text(`Pedido: ${pedido.codigo}\n`);
      printer.text(`Cliente: ${pedido.cliente}\n`);
      printer.text(`Data: ${new Date(pedido.data).toLocaleString('pt-BR')}\n`);
      printer.text('---------------------------\n');

      pedido.produtos.forEach((p: any) => {
        printer.text(`${p.quantidade} - ${p.nome} - ${(p.quantidade * p.preco).toFixed(2)}`);
        if (pedido.extras?.length) {
          pedido.extras.forEach((e: any) => printer.text(` - ${e}\n`));
        }
      });

      printer.text('---------------------------\n')
        .style('b')
        .text(`TOTAL: € ${Number(pedido.valor).toFixed(2)}\n`)
        .text('\nObrigado pela preferência!!!\n')
        .text('\nENTREGUE ESSA COMANDA PARA RETIRAR O PEDIDO\n')
        .text('\nCOMANDA INTERNA\n')
        .text('\nNÃO SERVE COMO COMPROVANTE FISCAL\n')
        .text('\nPEÇA SUA FATURA COM CONTRIBUINTE NO CAIXA!\n')
        .cut();
    };

    try {
      await new Promise<void>((resolve, reject) => {
        device.open(async (err: any) => {
          if (err) return reject(err);

          try {
            await imprimiPedido();
            if (vias > 1) await imprimiPedido();
            printer.close();
            resolve();
          } catch (err) {
            printer.close();
            reject(err);
          }
        });
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      return NextResponse.json({ error: 'Erro ao imprimir' }, { status: 500 });
    }
  } catch (err) {
    console.error('Erro interno na API:', err);
    return NextResponse.json({ error: 'Erro Interno' }, { status: 500 });
  }
}
