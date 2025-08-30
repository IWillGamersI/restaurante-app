import escpos from 'escpos';
import path from 'path';
import sharp from 'sharp';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export async function POST(req: Request) {
  try {
    // Extrai o token do header Authorization
    const authHeader = req.headers.get('Authorization') || '';
    const idToken = authHeader.replace('Bearer ', '').trim();
    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Token não fornecido' }), { status: 401 });
    }

    // Verifica token Firebase
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 });
    }

    // Verifica a role do usuário
    const userDoc = await admin.firestore().collection('usuarios').doc(decodedToken.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : null;

    if (role !== 'admin' && role !== 'loja') {
      return new Response(JSON.stringify({ error: 'Usuário não autorizado' }), { status: 403 });
    }

    // Usuário autorizado, segue a impressão
    const Network = require('escpos-network');
    const { pedido, vias = 1 } = await req.json();
    const device = new Network('192.168.1.100', 9100);
    const printer = new escpos.Printer(device);
    const logoPath = path.join(process.cwd(), 'public', 'logo1.png');

    const imprimiPedido = async () => {
      try {
        const logoBuffer = await sharp(logoPath)
          .resize(200)
          .flatten({ background: '#FFFFFF' })
          .threshold(128)
          .raw()
          .toBuffer({ resolveWithObject: true });

        const { data, info } = logoBuffer;
        printer.align('ct');
        printer.raster(new escpos.Image(data, info.width, info.height), 'dwdh');

        printer
          .align('ct')
          .style('b')
          .size(1, 1)
          .text(`Pedido: ${pedido.codigo}\n`)
          .text(`Cliente: ${pedido.cliente}\n`)
          .text(`Data: ${new Date(pedido.data).toLocaleString('pt-PT')}\n`)
          .text('---------------------------\n');

        pedido.produtos.forEach((p: any) => {
          printer.text(`${p.quantidade} - ${p.nome} - € ${(p.quantidade * p.preco).toFixed(2)}`);
        });

        if (pedido.extras?.length) {
          pedido.extras.forEach((e: any) => printer.text(` - ${e.nome}\n`));
        }

        printer
          .text('---------------------------\n')
          .style('b')
          .text(`TOTAL: € ${Number(pedido.valor).toFixed(2)}\n`)
          .text('\nObrigado pela preferência!!!\n')
          .text('\nENTREGUE ESSA COMANDA PARA RETIRAR O PEDIDO\n')
          .text('\nCOMANDA INTERNA\n')
          .text('\nNÃO SERVE COMO COMPROVANTE FISCAL\n')
          .text('\nPEÇA SUA FATURA COM CONTRIBUINTE NO CAIXA!\n')
          .cut();
      } catch (err) {
        console.error('Erro ao imprimir', err);
      }
    };

    device.open(async () => {
      await imprimiPedido();
      if (vias > 1) await imprimiPedido();
      printer.close();
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Erro Interno' }), { status: 500 });
  }
}
