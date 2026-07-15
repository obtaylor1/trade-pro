import { storage, type PracticeOrderTransactionInput } from "./storage";

export async function executePracticeOrder(userId: string, input: PracticeOrderTransactionInput) {
  const numbers = [input.quantity, input.notionalAmount, input.estimatedPrice, input.estimatedFees ?? 0];
  if (numbers.some(value => !Number.isFinite(value)) || input.quantity <= 0 || input.notionalAmount <= 0 || input.estimatedPrice <= 0) {
    throw Object.assign(new Error("Invalid practice order values."), { statusCode: 400 });
  }
  return storage.executePracticeOrderTransaction(userId, input);
}
