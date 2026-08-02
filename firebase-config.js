// ============================================================
// CONFIGURAÇÃO DO FIREBASE — VIDA FINANCEIRA
// ------------------------------------------------------------
// Isto é OPCIONAL. Sem preencher nada, a aplicação funciona à mesma:
// os movimentos ficam guardados no próprio dispositivo.
//
// Preencha só se quiser que a mesma pessoa veja os mesmos movimentos
// no telemóvel e no computador.
//
// 1. Vá a https://console.firebase.google.com/ e crie um projeto grátis
// 2. Active: Build > Authentication > Sign-in method > Email/Password
// 3. Active: Build > Firestore Database > Criar base de dados (modo produção)
// 4. Definições do projeto (engrenagem) > Os teus apps > Web (</>)
// 5. Copie o objecto "firebaseConfig" que o Firebase dá e cole aqui em baixo,
//    substituindo tudo o que está entre as aspas.
// 6. Publique as regras do ficheiro `firestore.rules` (ver INSTRUÇÕES.md)
// ============================================================

// Projeto: vida-financeira-faf77
//
// Estas chaves são públicas de propósito — vão dentro do site e qualquer
// visitante as consegue ler no navegador. Não são uma senha. O que protege
// mesmo os dados são as regras em `firestore.rules` e a lista de domínios
// autorizados no Authentication.
//
// O `measurementId` do Google Analytics foi deixado de fora: este site não
// carrega o SDK de Analytics, por isso o campo não teria uso nenhum.
const firebaseConfig = {
  apiKey: "AIzaSyAL4af_o5kHuzlIxWYFKAMShk11Hem96oE",
  authDomain: "vida-financeira-faf77.firebaseapp.com",
  projectId: "vida-financeira-faf77",
  storageBucket: "vida-financeira-faf77.firebasestorage.app",
  messagingSenderId: "409876255459",
  appId: "1:409876255459:web:c0a00beea50e04960f2bd6"
};

// ------------------------------------------------------------
// Quem entra no painel de administração (admin.html).
//
// Isto é só o que a página mostra. Quem protege mesmo os dados são as regras
// do Firestore, que verificam o mesmo email do lado do servidor — mudar esta
// lista no navegador não dá acesso a nada.
// ------------------------------------------------------------
const ADMIN_EMAILS = [
  'wly.vianna@gmail.com'
];

// Um `const` no topo de um ficheiro NÃO fica em `window` — cria uma ligação
// no âmbito global léxico, que é outra coisa. As páginas verificavam
// `window.ADMIN_EMAILS`, isso dava sempre indefinido, e o botão do painel
// nunca aparecia. Esta linha põe-no onde as páginas o procuram.
window.ADMIN_EMAILS = ADMIN_EMAILS;

// ------------------------------------------------------------
// Daqui para baixo não é preciso mexer.
//
// Enquanto a configuração acima estiver por preencher, não chamamos o
// Firebase de todo: se chamássemos, cada página abria com um erro na
// consola e o ecrã da conta ficava a prometer algo que não funciona.
// As páginas testam `window.auth` para saber se há nuvem disponível.
// ------------------------------------------------------------
(function () {
  const porPreencher = Object.values(firebaseConfig)
    .some(v => !v || String(v).startsWith('COLE-AQUI'));

  if (porPreencher || typeof firebase === 'undefined') return;

  try {
    firebase.initializeApp(firebaseConfig);
    window.auth = firebase.auth();
    window.db = firebase.firestore();
  } catch (e) {
    // Configuração errada ou Firebase inacessível: seguimos sem nuvem.
    console.warn('Firebase não iniciado:', e.message);
  }
})();
