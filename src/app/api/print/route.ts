import escpos from 'escpos';
import path from 'path';
import sharp from 'sharp';
import admin from 'firebase-admin';

// Carrega o JSON da conta de serviço
const serviceAccount = require('../../serviceAccountKey.json'); // ajuste o caminho conforme seu projeto

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(req: Request) {
  try {
    // Verifica header de autorização
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token não fornecido' }), { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 });
    }

    // Pega a role do usuário
    const userDoc = await admin.firestore().collection('usuarios').doc(decodedToken.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : null;

    if (role !== 'admin' && role !== 'loja') {
      return new Response(JSON.stringify({ error: 'Usuário não autorizado' }), { status: 403 });
    }

    // Dados do pedido
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
          .text(`Data: ${new Date(pedido.data).toLocaleString('pt-BR')}\n`)
          .text('---------------------------\n');

        pedido.produtos.forEach((p: any) => {
          printer.text(`${p.quantidade} - ${p.nome} - ${(p.quantidade * p.preco).toFixed(2)}`);
          if (pedido.extras?.length) {
            pedido.extras.forEach((e: any, i: any) => printer.text(` - ${e[i]}\n`));
          }
        });

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
        console.error('Erro ao gerar o pedido:', err);
        throw err;
      }
    };

    // Abre dispositivo e imprime
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

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      return new Response(JSON.stringify({ error: 'Erro ao imprimir' }), { status: 500 });
    }

  } catch (err) {
    console.error('Erro interno na API:', err);
    return new Response(JSON.stringify({ error: 'Erro Interno' }), { status: 500 });
  }
}
