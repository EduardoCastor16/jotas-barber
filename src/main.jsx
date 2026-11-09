import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const services = [
  { name: 'Corte disfarçado', price: 38 },
  { name: 'Corte na tesoura', price: 40 },
  { name: 'Corte kids', price: 40 },
  { name: 'Sobrancelha', price: 13 },
  { name: 'Pigmentação', price: 30 },
];

function App() {
  const admin = window.location.pathname.startsWith('/admin');
  return <main className="shell">
    <header><div className="mark">J<span>’</span></div><div><strong>BARBEARIA DO JOTA'S</strong><small>Estilo, precisão e atitude.</small></div></header>
    {admin ? <section className="panel"><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Painel do Jota</h1><p>Área administrativa em preparação. O acesso a agendamentos e pagamentos será liberado somente após a configuração de autenticação e banco de dados.</p><a className="button secondary" href="/">Voltar ao site</a></section> : <>
      <section className="hero"><p className="eyebrow">SEU ESTILO COMEÇA AQUI</p><h1>Seu próximo corte, <em>do seu jeito.</em></h1><p>Escolha seu serviço e prepare seu próximo visual. Agendamentos para o dia seguinte ou datas posteriores, sujeitos à confirmação do Jota após conferência do sinal via Pix.</p><a className="button" href="#servicos">Conhecer serviços</a></section>
      <section id="servicos"><p className="eyebrow">O QUE FAZEMOS</p><h2>Nossos serviços</h2><div className="services">{services.map(s=><article key={s.name}><span>{s.name}</span><strong>{s.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></article>)}</div><p className="note">Valores de referência, sujeitos à confirmação. A duração e as regras de agendamento serão cadastradas pelo administrador.</p></section>
      <section className="panel"><p className="eyebrow">EM BREVE</p><h2>Agendamento online</h2><p>Estamos preparando o cadastro de clientes, seleção de horários e envio de comprovante Pix pelo WhatsApp. Nenhum agendamento é realizado nesta versão inicial.</p></section>
    </>}
    <footer>© {new Date().getFullYear()} Barbearia do Jota's</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
