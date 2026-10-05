import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionTitle, StatusPill } from '../components/ui';
import { ChoiceRow, FormField, FormModal } from '../components/FormModal';
import type { AuthSession } from '../services/auth.client';
import { createContact, getContacts, updateContact, type ContactRecord, type NewContact } from '../services/erp.client';
import { colors } from '../theme';
import { Feedback, messageFrom, MiniButton, ScreenHeading, screenStyles } from './shared';

const emptyContact: NewContact = { name: '', type: 'Cliente', taxId: '', email: '', phone: '' };

export function ContactsScreen({ session }: { session: AuthSession }) {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [filter, setFilter] = useState<'Todos' | 'Cliente' | 'Proveedor'>('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ContactRecord | null | undefined>(undefined);
  const [form, setForm] = useState<NewContact>(emptyContact);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setContacts(await getContacts(session)); } catch (cause) { setError(messageFrom(cause)); }
    finally { setLoading(false); }
  }, [session]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => contacts.filter((contact) => filter === 'Todos' || contact.type === filter), [contacts, filter]);

  function open(contact: ContactRecord | null) { setEditing(contact); setForm(contact ? { name: contact.name, type: contact.type, taxId: contact.taxId, email: contact.email, phone: contact.phone } : emptyContact); setModalError(''); }

  async function save() {
    if (form.name.trim().length < 2) { setModalError('Escribe el nombre del contacto.'); return; }
    setBusy(true); setModalError('');
    try { if (editing) await updateContact(session, editing.id, form); else await createContact(session, form); setEditing(undefined); await load(); }
    catch (cause) { setModalError(messageFrom(cause)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeading eyebrow="CLIENTES Y PROVEEDORES" title="Contactos" subtitle="Directorio compartido para cotizaciones, ventas y documentos." action="Nuevo contacto" onAction={() => open(null)} />
        <Feedback loading={loading} error={error} />
        <View style={screenStyles.grid}>
          <Card style={styles.stat}><Text style={styles.statValue}>{contacts.filter((item) => item.type === 'Cliente').length}</Text><Text style={styles.statLabel}>Clientes</Text></Card>
          <Card style={styles.stat}><Text style={styles.statValue}>{contacts.filter((item) => item.type === 'Proveedor').length}</Text><Text style={styles.statLabel}>Proveedores</Text></Card>
        </View>
        <View style={styles.filters}>{(['Todos', 'Cliente', 'Proveedor'] as const).map((label) => <MiniButton key={label} label={label} onPress={() => setFilter(label)} tone={filter === label ? 'success' : 'normal'} />)}</View>
        <Card>
          <SectionTitle title="Directorio" action={`${visible.length} contactos`} />
          {!loading && visible.length === 0 ? <Feedback empty="Aún no hay contactos. Agrega el primero." /> : visible.map((contact, index) => (
            <View key={contact.id} style={[screenStyles.row, index === visible.length - 1 && screenStyles.rowLast]}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text></View>
              <View style={screenStyles.rowCopy}><Text style={screenStyles.rowTitle}>{contact.name}</Text><Text style={screenStyles.rowDetail}>{contact.email || 'Sin correo'} · {contact.phone || 'Sin teléfono'}{contact.taxId ? ` · ${contact.taxId}` : ''}</Text></View>
              <StatusPill label={contact.type} tone={contact.type === 'Cliente' ? 'info' : 'warning'} />
              <MiniButton label="Editar" onPress={() => open(contact)} />
            </View>
          ))}
        </Card>
      </ScrollView>
      <FormModal visible={editing !== undefined} title={editing ? 'Editar contacto' : 'Nuevo contacto'} description="Este contacto estará disponible al crear facturas." busy={busy} error={modalError} onClose={() => setEditing(undefined)} onSubmit={() => void save()}>
        <FormField label="Nombre o razón social" value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
        <ChoiceRow label="Tipo" value={form.type} options={['Cliente', 'Proveedor'] as const} onChange={(type) => setForm({ ...form, type })} />
        <FormField label="RFC / identificación fiscal" autoCapitalize="characters" value={form.taxId} onChangeText={(taxId) => setForm({ ...form, taxId })} />
        <FormField label="Correo" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(email) => setForm({ ...form, email })} />
        <FormField label="Teléfono" keyboardType="phone-pad" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} />
      </FormModal>
    </>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: 180 }, statValue: { color: colors.text, fontSize: 25, fontWeight: '800' }, statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark, borderWidth: 1, borderColor: colors.borderStrong }, avatarText: { color: colors.text, fontSize: 16, fontWeight: '900' }
});
