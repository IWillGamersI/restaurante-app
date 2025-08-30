// print-server/server.js
const express = require('express');
const bodyParser = require('body-parser');
const escpos = require('escpos');
const Network = require('escpos-network');

const app = express();
const PORT = 4000; // Porta local para receber pedidos

app.use(bodyParser.json());

app.post('/imprimir', async (req, res) => {
  try {
    const { pedido, vias = 1 } = req.body;

    const device = new Network('192.168.1.100', 9100);
    const printer = new escpos.Printer(device);

    const imprimiPedido = async () => {
       printer
        .align('ct')
        .style('b')
        .size(1, 1) // tamanho normal
        .text('Top pizzas')
        .text(formatarTexto(`Pedido: ${pedido.codigo}`))
        .text(formatarTexto(`Cliente: ${pedido.cliente}`))
        .size(0,0)
        .text(formatarTexto(`Data: ${new Date(pedido.data).toLocaleString('pt-BR')}`))
        .text(formatarTexto('---------------------------'));

      pedido.produtos.forEach(p => {
        printer.text(`${p.quantidade} - ${p.nome} - ${(p.quantidade * p.preco).toFixed(2)}`);
        if (pedido.extras?.length) {
          pedido.extras.forEach((e,i) => printer.text(formatarTexto(` - ${e[i]}`)));
        }
      });

      printer
        .text(formatarTexto('---------------------------'))
        .style('b')
        .text(formatarTexto(`TOTAL: ${Number(pedido.valor).toFixed(2)}`))
        .text(formatarTexto('Obrigado pela preferência!!!'))
        .text(formatarTexto('ENTREGUE ESSA COMANDA PARA RETIRAR O PEDIDO'))
        .text(formatarTexto('COMANDA INTERNA'))
        .text(formatarTexto('NÃO SERVE COMO COMPROVANTE FISCAL'))
        .text(formatarTexto('PEÇA SUA FATURA COM CONTRIBUINTE NO CAIXA!'))
        .text()
        .text(formatarTexto('PEÇA SUA FATURA COM CONTRIBUINTE NO CAIXA!'))
        .text(formatarTexto(''))
        .text(formatarTexto(''))
        .text(formatarTexto(''))
        .cut();
    };

    await new Promise((resolve, reject) => {
      device.open(async (err) => {
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

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao imprimir:', err);
    res.status(500).json({ error: 'Erro ao imprimir' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de impressão rodando em http://localhost:${PORT}`);
});
