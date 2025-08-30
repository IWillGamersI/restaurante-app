import escpos from 'escpos';
import path from 'path';
import sharp from 'sharp';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export async function POST(req: Request) {
  try {
    // ======================
    // 1. Verifica autenticação
    // ======================
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token não fornecido' }), { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 });
    }

    // ======================
    // 2. Verifica role do usuário
    // ======================
    const userDoc = await admin.firestore().collection('usuarios').doc(decodedToken.uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : null;

    if (role !== 'admin' && role !== 'loja') {
      return new Response(JSON.stringify({ error: 'Usuário não autorizado' }), { status: 403 });
    }

    // ======================
    // 3. Dados do pedido
    // ======================
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
          if (p.extras?.length) {
            p.extras.forEach((e: any) => printer.text(`   + ${e}\n`));
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

    // ======================
    // 4. Abre dispositivo e imprime com timeout
    // ======================
    const printWithTimeout = async (timeoutMs = 10000) => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Tempo limite da impressora excedido'));
        }, timeoutMs);

        device.open(async (err: any) => {
          clearTimeout(timer);
          if (err) return reject(err);

          try {
            await imprimiPedido();
            if (vias > 1) {
              for (let i = 1; i < vias; i++) {
                await imprimiPedido();
              }
            }
            printer.close();
            resolve();
          } catch (err) {
            printer.close();
            reject(err);
          }
        });
      });
    };

    try {
      await printWithTimeout();
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err: any) {
      console.error('Erro ao imprimir:', err.message || err);
      return new Response(JSON.stringify({ error: 'Erro ao imprimir: ' + (err.message || 'desconhecido') }), { status: 500 });
    }

  } catch (err) {
    console.error('Erro interno na API:', err);
    return new Response(JSON.stringify({ error: 'Erro Interno' }), { status: 500 });
  }
}
