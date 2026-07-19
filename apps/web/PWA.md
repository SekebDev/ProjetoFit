# PWA — Progressive Web App

Hipertrof.AI é uma Progressive Web App totalmente funcional. Pode ser instalada como um app nativo em qualquer dispositivo (mobile ou desktop).

## ✨ Recursos Implementados

### 1. **Instalação como App Nativo**
- Funciona em iOS, Android, macOS, Windows, Linux
- Instala direto da barra de endereço do navegador
- Sem necessidade de App Store ou Play Store

### 2. **Modo Offline**
- Service Worker cacheiza todos os assets do Next.js
- API com **stale-while-revalidate**: mostra dados em cache + atualiza em background
- Funciona offline com dados anteriormente carregados

### 3. **App Shortcuts** (contexto de menu)
Ao manter pressionado o ícone do app:
- **Novo Plano** → vai para `/plans/new`
- **Meus Exercícios** → vai para `/exercises`
- **Meu Perfil** → vai para `/profile`

### 4. **Screenshots** (App Store discovery)
- 2 screenshots configurados no manifest
- Mobile (540x720) e Desktop (1280x720)
- Melhora discoverabilidade em app stores

### 5. **Splash Screen Customizado**
- iOS: mostra ícone + cor de fundo #0e1014 ao abrir
- Android: gerado automaticamente pelo navegador

## 🚀 Como Instalar

### Desktop (Chrome, Edge, Safari)
1. Acesse https://hipertrof.ai (em produção)
2. Clique no ícone de instalação na barra de endereço
3. Confirme "Instalar"
4. App abre em janela independente

### iPhone (iOS 15+)
1. Abra em Safari
2. Tap no botão "Compartilhar"
3. Selecione "Adicionar à tela de início"
4. Confirm "Adicionar"

### Android (Chrome 39+)
1. Abra no Chrome
2. Tap no menu (3 pontos)
3. Selecione "Instalar app"
4. Confirm "Instalar"

## 🔧 Desenvolvimento

### Build & Deploy
```bash
npm run build      # Compila Next.js + Service Worker
npm start          # Testa em http://localhost:3000
npm run screenshots # Gera screenshots (placeholders atualmente)
```

### Service Worker
- **Arquivo fonte**: `src/app/sw.ts`
- **Compilado para**: `public/sw.js` (via `@serwist/next`)
- **Tecnologia**: Serwist (wrapper do Workbox)

### Manifest
- **Localização**: `public/manifest.webmanifest`
- **Referenciado em**: `src/app/layout.tsx` (meta tag)
- **Inclui**:
  - Icons (192, 512, maskable)
  - Shortcuts (3)
  - Screenshots (2)
  - Configurações (display, tema, idioma)

## 📊 Estratégia de Cache

| Tipo | Estratégia | TTL |
|------|-----------|-----|
| JS/CSS | Network-first com fallback | - |
| Imagens | Stale-while-revalidate | 30 dias |
| API GET | Stale-while-revalidate | 7 dias |
| API POST/PUT/DELETE | Network-only | - |

## 🎯 Próximos Passos

### High Priority
- [ ] Gerar screenshots reais (mobile + desktop screenshots da app)
- [ ] Testar em dispositivos iOS reais
- [ ] Validar com Lighthouse PWA audit

### Medium Priority
- [ ] Adicionar handler de notificação push
- [ ] Implementar atualização automática do SW
- [ ] Adicionar more app shortcuts

### Low Priority
- [ ] Share target (compartilhar via sistema)
- [ ] Standalone file handling
- [ ] Compartilhamento de dados entre abas

## 🧪 Teste Local

```bash
# Terminal 1: Inicia servidor de produção
npm run build && npm start

# Terminal 2: Acessa em Chrome DevTools
# DevTools → Application → Manifest
# Verifica: ✓ Identity, ✓ Presentation, ✓ Icons
```

## 📚 Referências

- [MDN: Web Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Serwist Documentation](https://serwist.pages.dev/)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [WebKit: PWA on iOS](https://webkit.org/status/#specification-web-app-manifest)

## 🐛 Debugging

### Service Worker não registra
1. Verificar console do navegador
2. DevTools → Application → Service Workers
3. Confirmar que https (ou localhost) está sendo usado

### Cache não funciona
1. DevTools → Application → Cache Storage
2. Limpar cache e recarregar
3. Verificar `sw.ts` para regras de cache

### Screenshots não aparecem
1. Verificar se `screenshot-540.png` e `screenshot-1280.png` existem em `public/`
2. Validar manifest com [manifest validator](https://manifest-validator.appspot.com/)
