
const express = require('express');
const bodyParser = require('body-parser');
const escpos = require('escpos');
escpos.Network = require('escpos-network');
const iconv = require('iconv-lite');

function formatarTexto(texto) {
  return iconv.encode(texto.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), 'cp858');
}

const app = express();
app.use(bodyParser.json());

app.post('/print', async (req, res) => {
  try {
    const { pedido, vias = 1 } = req.body;

    const device = new escpos.Network('192.168.1.100', 9100); // IP da impressora
    const printer = new escpos.Printer(device);

    device.open(async (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao conectar impressora' });

      for (let i = 0; i < vias; i++) {
        printer
          .align('ct')
          .style('b')
          .size(1,1)
          .text('Top pizzas')
          .text(formatarTexto(`Pedido: ${pedido.codigo}`))
          .text(formatarTexto(`Cliente: ${pedido.cliente}`))
          .size(0,0)
          .text(formatarTexto(`Data: ${new Date(pedido.data).toLocaleString('pt-BR')}`))
          .text(formatarTexto('---------------------------'));

        pedido.produtos.forEach(p => {
          printer.text(formatarTexto(`${p.quantidade} - ${p.nome} - ${(p.quantidade * p.preco).toFixed(2)}`));
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
          .cut();
      }

      printer.close();
      res.json({ ok: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno na impressão' });
  }
});

app.listen(3001, () => console.log('✅ Servidor de impressão local rodando na porta 3001'));
