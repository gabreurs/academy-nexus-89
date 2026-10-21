import coverCondoexpo from "@/assets/news/condoexpo-segsummit.jpg";
import coverExpoSindico from "@/assets/news/exposindico-copacabana.jpg";

/**
 * Matérias de imprensa do SíndicoLab.
 * Conteúdo editorial estático — publicação controlada por código,
 * sem necessidade de CMS nesta fase.
 */

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "list"; items: string[] };

export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string; // ISO
  cover: string;
  coverAlt: string;
  blocks: ArticleBlock[];
  service?: { label: string; value: string; href?: string }[];
};

const AUTHOR = "Mariana Desimone";

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    slug: "arena-condoexpo-sp-segsummit-2026",
    title: "Grupo DM Eventos organiza arena Condoexpo.SP no SegSummit, em São Paulo",
    excerpt:
      "Espaço exclusivo para o mercado condominial será realizado em 21 de outubro, no Distrito Anhembi, com debates sobre Inteligência Artificial, tecnologia, gestão, sustentabilidade e os desafios da convivência. Participação é gratuita.",
    category: "Eventos",
    author: AUTHOR,
    publishedAt: "2026-10-21",
    cover: coverCondoexpo,
    coverAlt: "Arena de tecnologia e segurança em feira no Distrito Anhembi, São Paulo",
    blocks: [
      {
        type: "p",
        text: "No dia 21 de outubro, o Distrito Anhembi, em São Paulo, receberá a Arena Condoexpo.SP, espaço dedicado ao mercado condominial dentro do SegSummit, um dos principais encontros de tecnologia e segurança da América Latina. Organizada pelo Grupo DM Eventos, a iniciativa reunirá síndicos, administradoras, gestores prediais e especialistas para discutir como as inovações tecnológicas e as transformações sociais estão mudando a administração dos condomínios.",
      },
      {
        type: "p",
        text: "Com o conceito “O futuro dos condomínios começa aqui”, a arena terá uma programação que vai da aplicação prática da inteligência artificial à prevenção de riscos climáticos, passando por segurança, legislação, acessibilidade, convivência entre gerações e gestão de pessoas.",
      },
      {
        type: "p",
        text: "A proposta é aproximar o mercado condominial das soluções e discussões que já fazem parte do universo da segurança e da tecnologia, ampliando o acesso dos profissionais a conhecimentos e ferramentas que podem contribuir para uma gestão mais eficiente.",
      },
      {
        type: "p",
        text: "Para Dil Melo, CEO do Grupo DM Eventos, a realização de uma arena exclusiva dentro do SegSummit representa uma oportunidade de ampliar a participação do setor condominial nos debates sobre inovação.",
      },
      {
        type: "quote",
        text: "Organizar a Arena Condoexpo.SP dentro do SegSummit é uma oportunidade de dar ainda mais protagonismo ao mercado condominial em um dos maiores encontros de tecnologia e segurança da América Latina. Estamos falando de um setor que administra patrimônios, move negócios e impacta diretamente a vida de milhões de pessoas. Nosso propósito é aproximar síndicos e gestores das inovações que já estão transformando as cidades, promovendo conhecimento, conexões estratégicas e novas oportunidades. Afinal, o futuro dos condomínios passa necessariamente pela tecnologia, mas também pela valorização das pessoas que estão à frente dessa gestão.",
        cite: "Dil Melo, CEO do Grupo DM Eventos",
      },
      { type: "h2", text: "Inteligência artificial e segurança entre os destaques" },
      {
        type: "p",
        text: "Um dos temas centrais da programação será o uso da inteligência artificial na administração condominial. Às 14h, o especialista Rafa Bernardes apresentará aplicações práticas da tecnologia para otimizar processos, apoiar a tomada de decisões e aumentar a produtividade de síndicos e gestores.",
      },
      {
        type: "p",
        text: "A integração entre tecnologia e segurança também estará em debate no painel “Do Smart Sampa ao Condomínio Inteligente: Como a Tecnologia Está Redesenhando a Segurança e a Gestão”, com Mariana Mendonça e Jabs Cres. O encontro abordará as possibilidades de utilização de sistemas inteligentes de monitoramento e de novas tecnologias na proteção de pessoas e patrimônios.",
      },
      {
        type: "p",
        text: "Outro assunto relevante será a adaptação dos condomínios aos eventos climáticos extremos. A especialista em ESG e sustentabilidade Rosely Ruibal discutirá medidas de prevenção, soluções sustentáveis e estratégias para tornar as edificações mais preparadas para os impactos das mudanças climáticas.",
      },
      { type: "h2", text: "Gestão de pessoas, legislação e convivência" },
      {
        type: "p",
        text: "Além das inovações tecnológicas, a Arena Condoexpo.SP abrirá espaço para questões que fazem parte da rotina dos gestores condominiais.",
      },
      {
        type: "p",
        text: "A programação terá início com Fabio Interaminense, que abordará as competências necessárias para o síndico acompanhar as transformações do setor. Na sequência, a advogada Claudia Hernandez discutirá os impactos da NR-01 na gestão dos condomínios.",
      },
      {
        type: "p",
        text: "A convivência entre diferentes gerações será tema de um painel com Sonia Inakake, CEO da Direcional Condomínios, Daniela Bibiano e a síndica Claudia Guastelli. O debate abordará acessibilidade, segurança, responsabilidade coletiva e qualidade de vida de crianças e idosos nos espaços residenciais.",
      },
      {
        type: "p",
        text: "Outro destaque será o painel “Condomínio Saudável, Gestão Valorizada: O Que Está Além das Contas e da Manutenção”, que discutirá a importância das relações humanas e de uma visão mais ampla da administração condominial.",
      },
      {
        type: "p",
        text: "Ao reunir especialistas de diferentes áreas, a Arena Condoexpo.SP busca ampliar o debate sobre o futuro da gestão condominial e promover a troca de experiências entre profissionais e empresas do setor.",
      },
    ],
    service: [
      { label: "Evento", value: "Arena Condoexpo.SP, dentro do SegSummit" },
      { label: "Data", value: "21 de outubro de 2026 (quarta-feira)" },
      { label: "Horário", value: "Credenciamento às 8h e programação a partir das 9h" },
      { label: "Local", value: "Distrito Anhembi, Sala 105, São Paulo (SP)" },
      { label: "Organização da arena", value: "Grupo DM Eventos" },
      {
        label: "Público",
        value: "Síndicos, subsíndicos, administradoras, gestores prediais e profissionais do mercado condominial",
      },
      { label: "Entrada", value: "Gratuita, mediante inscrição antecipada" },
      { label: "Inscrições", value: "Sympla", href: "https://www.sympla.com.br/evento__3610631" },
    ],
  },
  {
    slug: "expo-sindico-copacabana-palace-2026",
    title: "Expo Síndico Copacabana Palace terá Denise Fraga como palestrante master em sua 13ª edição",
    excerpt:
      "Evento acontece no dia 22 de outubro, no Rio de Janeiro, com debates sobre gestão condominial, inovação, liderança e relações humanas. Programação inclui ainda os palcos W Condo e Rodada Literária, além de happy hour com o Bloco dos Síndicos.",
    category: "Eventos",
    author: AUTHOR,
    publishedAt: "2026-10-21",
    cover: coverExpoSindico,
    coverAlt: "Salão do Copacabana Palace durante congresso do mercado condominial, Rio de Janeiro",
    blocks: [
      {
        type: "p",
        text: "No dia 22 de outubro, o tradicional Copacabana Palace, no Rio de Janeiro, será palco do Expo Síndico Copacabana Palace – 13º Congresso APSA, um dos principais encontros do mercado condominial. O evento reunirá síndicos, administradores, gestores de propriedades, especialistas e representantes de grandes empresas para debater os desafios, as tendências e as transformações do setor.",
      },
      {
        type: "p",
        text: "O principal destaque da programação será a atriz Denise Fraga, palestrante master desta edição, que apresentará, às 9h, a palestra “Convivência e Desafios da Humanização das Relações no Mundo Condominial”. A proposta é trazer uma reflexão sobre os desafios dos relacionamentos nos tempos atuais, especialmente no ambiente condominial, onde o diálogo, a empatia, a escuta e a capacidade de lidar com conflitos são fundamentais para uma gestão eficiente.",
      },
      {
        type: "p",
        text: "Com uma programação voltada à atualização profissional e à troca de experiências, o congresso contará ainda com palestras, painéis de discussão e apresentação de casos práticos, abordando temas relevantes para quem atua na administração e na gestão de condomínios.",
      },
      {
        type: "p",
        text: "Nesta edição, o evento terá também dois palcos paralelos à programação principal. Às 14h30, o palco Rodada Literária abrirá espaço para a literatura, ampliando as possibilidades de troca de experiências e conhecimento entre os participantes. Já às 16h30, o palco W Condo – A Mulher na Sindicatura será dedicado à presença e à atuação feminina no setor condominial, valorizando o protagonismo das mulheres na gestão de propriedades.",
      },
      {
        type: "p",
        text: "Paralelamente, a Expo Síndico proporcionará aos participantes contato direto com empresas e fornecedores de produtos e serviços para o segmento. O espaço será uma oportunidade para conhecer novas tecnologias, comparar soluções, descobrir inovações e estabelecer parcerias comerciais.",
      },
      {
        type: "p",
        text: "A edição de 2026 também marca uma importante expansão da Expo Síndico, que contará com uma estrutura ampliada e entrada de acesso privativo pela Avenida Nossa Senhora de Copacabana.",
      },
      {
        type: "quote",
        text: "Este ano, dobramos de tamanho e teremos uma entrada exclusiva. É uma conquista muito significativa para nós, especialmente porque a história da Expo Síndico começou justamente neste hotel, em 2019. Retornar agora com uma estrutura ainda maior mostra o quanto o evento cresceu e se consolidou no mercado condominial.",
        cite: "Dil Melo, do Grupo DM, idealizadora e organizadora da Expo Síndico",
      },
      {
        type: "p",
        text: "Além do conteúdo técnico, o encontro tem como um de seus principais atrativos o networking. A proposta é aproximar profissionais, especialistas e empresas, estimulando a troca de conhecimentos e a geração de novas oportunidades de negócios.",
      },
      {
        type: "p",
        text: "Para encerrar a programação, os participantes poderão desfrutar de um happy hour no Copacabana Palace, com a animação do Bloco dos Síndicos. O momento será dedicado à descontração, à integração e ao fortalecimento das relações profissionais, em um dos endereços mais emblemáticos do Rio de Janeiro.",
      },
      {
        type: "p",
        text: "Ao chegar à sua 13ª edição, o Congresso APSA e Expo Síndico reforça sua proposta de conectar os diferentes agentes do mercado condominial, reunindo conhecimento, inovação, valorização profissional e oportunidades de negócios em um único evento.",
      },
    ],
    service: [
      { label: "Evento", value: "Expo Síndico Copacabana Palace – 13º Congresso APSA" },
      { label: "Data", value: "22 de outubro de 2026 (quinta-feira)" },
      { label: "Local", value: "Hotel Copacabana Palace, Rio de Janeiro (RJ)" },
      { label: "Entrada", value: "Avenida Nossa Senhora de Copacabana, 291, Copacabana" },
      {
        label: "Programação",
        value:
          "8h credenciamento · 9h palestra master com Denise Fraga · 14h sorteio Expo Síndico · 14h30 palco Rodada Literária · 16h30 palco W Condo · encerramento com happy hour do Bloco dos Síndicos",
      },
      {
        label: "Público",
        value: "Síndicos, administradores, gestores de propriedades, especialistas, fornecedores e empresas do mercado condominial",
      },
      { label: "Organização", value: "Grupo DM" },
      { label: "Inscrições", value: "Sympla", href: "https://www.sympla.com.br/evento__3316729" },
    ],
  },
];

export function getArticle(slug: string): NewsArticle | undefined {
  return NEWS_ARTICLES.find((a) => a.slug === slug);
}

export function formatArticleDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
