import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text } from 'react-native';
import { Button, Card, Field, Input } from '../../components/ui';
import { useApi } from '../../lib/api';
import { useSettings } from '../../lib/settings';
import { colors } from '../../lib/theme';

export default function SettingsScreen() {
  const { settings, update, loaded } = useSettings();
  const api = useApi();
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (loaded) {
      setServerUrl(settings.serverUrl);
      setApiKey(settings.apiKey);
    }
  }, [loaded, settings]);

  const save = async () => {
    await update({ serverUrl, apiKey });
    Alert.alert('Saved');
  };

  const test = async () => {
    setTesting(true);
    try {
      await update({ serverUrl, apiKey });
      await api.health();
      Alert.alert('Connected', 'The family calendar server is reachable.');
    } catch (e) {
      Alert.alert('Connection failed', e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const feed = api.feedUrl('all');

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Field label="Server URL">
          <Input value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://calendar.example.com" />
        </Field>
        <Field label="Family key">
          <Input value={apiKey} onChangeText={setApiKey} autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder="API_KEY from the server" />
        </Field>
        <Button title="Save" onPress={save} />
        <Button title="Test connection" variant="secondary" onPress={test} loading={testing} style={{ marginTop: 8 }} />
      </Card>

      <Text style={styles.section}>Subscribe on another device</Text>
      <Card>
        <Text style={styles.body}>
          Besides email invites, you can subscribe to the whole family calendar from Apple Calendar, Google Calendar or Outlook using this link. It stays in sync automatically.
        </Text>
        <Text selectable style={styles.mono}>{feed}</Text>
        <Button title="Open in Calendar" variant="secondary" onPress={() => Linking.openURL(feed).catch(() => Alert.alert('No calendar app can open this link'))} />
        <Button title="Share link" variant="secondary" onPress={() => Share.share({ message: feed })} style={{ marginTop: 8 }} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginTop: 24, marginBottom: 8, marginLeft: 4 },
  body: { color: colors.text, lineHeight: 20, marginBottom: 10 },
  mono: { fontFamily: 'Courier', fontSize: 12, color: colors.muted, marginBottom: 12 },
});
