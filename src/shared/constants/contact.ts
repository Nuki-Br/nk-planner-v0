// Contatos da equipe Nuki (MVP de validação: a conclusão orienta o cliente
// a entrar em contato — sem integração com a Personalização por enquanto).
// WhatsApp: mesmo número oficial da landing page (nk-lp / wa.me).
export const NUKI_WHATSAPP = "551531994490";
export const NUKI_EMAIL = "contato@nukibr.com";

/** Link wa.me com mensagem pré-preenchida. */
export function nukiWhatsAppUrl(mensagem: string): string {
  return `https://wa.me/${NUKI_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}
