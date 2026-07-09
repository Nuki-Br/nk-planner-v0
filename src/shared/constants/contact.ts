// Contatos da equipe Nuki (MVP de validação: a publicação orienta o cliente
// a entrar em contato — sem integração com a Personalização por enquanto).
export const NUKI_WHATSAPP = "5515981383864";
export const NUKI_EMAIL = "contato@nukibr.com";

/** Link wa.me com mensagem pré-preenchida. */
export function nukiWhatsAppUrl(mensagem: string): string {
  return `https://wa.me/${NUKI_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}
