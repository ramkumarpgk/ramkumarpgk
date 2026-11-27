import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Field, Input } from '../../components/ui';
import { useApi } from '../../lib/api';
import { colors, MEMBER_COLORS } from '../../lib/theme';
import type { EmailLabel, MemberEmail } from '../../lib/types';

const LABELS: EmailLabel[] = ['personal', 'work', 'school', 'other'];

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const api = useApi();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [emails, setEmails] = useState<MemberEmail[]>([{ address: '', label: 'personal', notify: true }]);

  useEffect(() => {
    if (isNew) return;
    api.members()
      .then((all) => {
        const m = all.find((x) => x.id === id);
        if (!m) throw new Error('Member not found');
        setName(m.name);
        setColor(m.color);
        setEmails(m.emails);
      })
      .catch((e) => Alert.alert('Error', e.message, [{ text: 'OK', onPress: () => router.back() }]))
      .finally(() => setLoading(false));
  }, [api, id, isNew]);

  const setEmail = (i: number, patch: Partial<MemberEmail>) =>
    setEmails((list) => list.map((e, j) => (i === j ? { ...e, ...patch } : e)));

  const save = async () => {
    const cleaned = emails.filter((e) => e.address.trim());
    if (!name.trim()) return Alert.alert('Please enter a name');
    if (!cleaned.length) return Alert.alert('Please add at least one email');
    setSaving(true);
    try {
      const body = { name, color, emails: cleaned };
      if (isNew) await api.createMember(body);
      else await api.updateMember(id, body);
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Remove member?', `${name} will be removed from all events.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteMember(id);
            router.back();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isNew ? 'New member' : name || 'Family member' }} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Field label="Name">
          <Input value={name} onChangeText={setName} placeholder="e.g. Priya" autoFocus={isNew} />
        </Field>

        <Field label="Colour">
          <View style={styles.colors}>
            {MEMBER_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={`Colour ${c}`}
                style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchSel]} />
            ))}
          </View>
        </Field>

        <Text style={styles.section}>Email accounts</Text>
        <Text style={styles.hint}>Calendar invites are sent to every address with “Send invites” on.</Text>
        {emails.map((e, i) => (
          <Card key={i} style={{ marginBottom: 10 }}>
            <Input
              value={e.address}
              onChangeText={(t) => setEmail(i, { address: t })}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={[styles.labels, { marginTop: 10 }]}>
              {LABELS.map((l) => (
                <Chip key={l} label={l} selected={e.label === l} onPress={() => setEmail(i, { label: l })} />
              ))}
            </View>
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.text }}>Send invites</Text>
              <Switch value={e.notify} onValueChange={(v) => setEmail(i, { notify: v })} />
            </View>
            {emails.length > 1 && (
              <Text style={styles.remove} onPress={() => setEmails((list) => list.filter((_, j) => j !== i))}>Remove email</Text>
            )}
          </Card>
        ))}
        <Button
          title="+ Add another email"
          variant="secondary"
          onPress={() => setEmails((l) => [...l, { address: '', label: l.length ? 'work' : 'personal', notify: true }])}
        />

        <Button title={isNew ? 'Add member' : 'Save'} onPress={save} loading={saving} style={{ marginTop: 24 }} />
        {!isNew && <Button title="Remove member" variant="danger" onPress={remove} style={{ marginTop: 10 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchSel: { borderWidth: 3, borderColor: colors.text },
  section: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  hint: { color: colors.muted, marginVertical: 6 },
  labels: { flexDirection: 'row', flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  remove: { color: colors.danger, marginTop: 10, fontWeight: '600' },
});
