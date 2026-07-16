// Contatos da equipe Nuki (MVP de validação: a conclusão orienta o cliente
// a entrar em contato — sem integração com a Personalização por enquanto).
// WhatsApp: mesmo número oficial da landing page (nk-lp / wa.me).
export const NUKI_WHATSAPP = "551531994490";
export const NUKI_EMAIL = "contato@nukibr.com";

/** Link wa.me com mensagem pré-preenchida. */
export function nukiWhatsAppUrl(mensagem: string): string {
  return `https://wa.me/${NUKI_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

/** WhatsApp do Pedro para feedback do beta do Planner (não é o número oficial da Nuki). */
export const FEEDBACK_WHATSAPP = "5515974025415";

/** Link wa.me do canal de feedback do beta com mensagem pré-preenchida. */
export function feedbackWhatsAppUrl(mensagem: string): string {
  return `https://wa.me/${FEEDBACK_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}
