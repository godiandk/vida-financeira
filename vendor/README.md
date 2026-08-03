# vendor

Código de terceiros, guardado aqui em vez de vir de um CDN.

A razão é a mesma que está no resto deste projecto: a aplicação tem de
funcionar instalada e sem internet, e ninguém de fora tem de ficar a saber
quem a abriu, quando, e a partir de que rede.

## ocr

O motor de leitura de talões. Corre dentro do telemóvel — não há servidor
nenhum, e por isso não há nenhuma chave secreta que num site público estaria à
vista de toda a gente.

| ficheiro | o que é | tamanho |
|---|---|---|
| `tesseract.min.js` | Tesseract.js 5.1.1 (MIT) | 67 KB |
| `worker.min.js` | o worker do Tesseract.js | 124 KB |
| `tesseract-core-simd-lstm.js` + `.wasm` | motor, para telemóveis com SIMD | 3,0 MB |
| `tesseract-core-lstm.js` + `.wasm` | o mesmo, para telemóveis sem SIMD | 3,0 MB |
| `por.traineddata.gz` | português (tessdata_best, inteiros) | 1,4 MB |

Cada telemóvel descarrega **um** dos dois motores, conforme o que suporta:
cerca de 4,3 MB ao todo, e uma vez só. Nada disto é descarregado ao abrir o
site — só quando alguém manda ler um talão, depois de lhe ser dito o tamanho.

Licenças: Tesseract.js e tesseract.js-core são MIT; os dados de treino do
Tesseract são Apache 2.0. Os textos das licenças vêm dentro dos próprios
pacotes.

### de onde vieram

```
npm install tesseract.js@5 @tesseract.js-data/por
cp node_modules/tesseract.js/dist/{tesseract.min.js,worker.min.js}      vendor/ocr/
cp node_modules/tesseract.js-core/tesseract-core-simd-lstm.{js,wasm}    vendor/ocr/
cp node_modules/tesseract.js-core/tesseract-core-lstm.{js,wasm}         vendor/ocr/
cp node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz vendor/ocr/
```

O `4.0.0_best_int` é o dicionário "best" com os pesos em inteiros: 1,4 MB em
vez dos 6,8 MB do normal, com a mesma qualidade em texto impresso — que é o
que um talão é.
