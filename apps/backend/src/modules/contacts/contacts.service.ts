import type { CatalogPaginationQuery, CreateContactInput, UpdateContactInput } from '@erp/contracts';
import { NotFoundError } from '../../core/errors/app-error.js';
import { ContactModel } from './contact.model.js';

function serializeContact(contact: Record<string, unknown>) {
  return {
    id: String(contact._id),
    name: String(contact.name),
    type: contact.type === 'Proveedor' ? 'Proveedor' as const : 'Cliente' as const,
    taxId: typeof contact.taxId === 'string' ? contact.taxId : '',
    email: typeof contact.email === 'string' ? contact.email : '',
    phone: typeof contact.phone === 'string' ? contact.phone : '',
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  };
}

export async function listContacts(tenantId: string, options: CatalogPaginationQuery) {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { tenantId };
  if (options.search) {
    filter.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { email: { $regex: options.search, $options: 'i' } },
      { taxId: { $regex: options.search, $options: 'i' } }
    ];
  }

  const [contacts, total] = await Promise.all([
    ContactModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    ContactModel.countDocuments(filter)
  ]);

  return {
    items: contacts.map((contact) => serializeContact(contact as unknown as Record<string, unknown>)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
}

export async function createContact(tenantId: string, input: CreateContactInput) {
  const contact = await ContactModel.create({ ...input, tenantId });
  return serializeContact(contact.toObject() as Record<string, unknown>);
}

export async function updateContact(tenantId: string, id: string, input: UpdateContactInput) {
  const contact = await ContactModel.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: input },
    { new: true, runValidators: true }
  ).lean();
  if (!contact) throw new NotFoundError('Contacto no encontrado.');
  return serializeContact(contact as unknown as Record<string, unknown>);
}

export async function deleteContact(tenantId: string, id: string) {
  const contact = await ContactModel.findOneAndDelete({ _id: id, tenantId }).lean();
  if (!contact) throw new NotFoundError('Contacto no encontrado.');
  return { id, name: contact.name, type: contact.type };
}
