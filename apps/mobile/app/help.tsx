import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius } from '../src/constants/theme';

// Help center categories and articles
const helpCategories = [
  {
    id: 'pedidos',
    name: 'Pedidos',
    icon: '🍽️',
    description: 'Como hacer pedidos, cancelar y ver estado',
    articles: [
      {
        id: 'crear-pedido',
        title: 'Como crear un pedido',
        content: `Para crear un pedido, sigue estos pasos:

1. Ve a la pestaña "Cafeteria" en el menu inferior
2. Selecciona el estudiante para el cual quieres hacer el pedido
3. Navega por el menu y selecciona los productos que deseas
4. Ajusta las cantidades segun necesites
5. Revisa el carrito de compras
6. Selecciona la fecha y hora de retiro
7. Confirma el pedido

Se descontaran los tickets correspondientes de la cuenta del estudiante.`,
      },
      {
        id: 'cancelar-pedido',
        title: 'Como cancelar un pedido',
        content: `Puedes cancelar un pedido que este en estado "Pendiente", "Confirmado" o "En preparacion":

1. Ve a la pestaña "Historial"
2. Encuentra el pedido que deseas cancelar
3. Toca el boton "Cancelar" en la tarjeta del pedido
4. Confirma la cancelacion

Los tickets seran reintegrados automaticamente a la cuenta del estudiante.

Nota: No puedes cancelar pedidos que ya esten "Listos para retirar" o "Entregados".`,
      },
      {
        id: 'ver-estado',
        title: 'Ver estado de mis pedidos',
        content: `Para ver el estado de tus pedidos:

1. Ve a la pestaña "Historial"
2. Veras todos tus pedidos ordenados por fecha
3. Cada pedido muestra su estado actual:
   - Pendiente: El pedido fue recibido
   - Confirmado: La cafeteria confirmo el pedido
   - En preparacion: Estan preparando tu pedido
   - Listo: El pedido esta listo para retirar
   - Entregado: El pedido fue entregado
   - Cancelado: El pedido fue cancelado

Toca cualquier pedido para ver mas detalles.`,
      },
    ],
  },
  {
    id: 'cafeteria',
    name: 'Cafeteria',
    icon: '🏪',
    description: 'Menu, disponibilidad y horarios',
    articles: [
      {
        id: 'ver-menu',
        title: 'Como ver el menu',
        content: `El menu de la cafeteria esta disponible en la pestaña "Cafeteria":

1. Ve a la pestaña "Cafeteria"
2. Selecciona el colegio y cafeteria (si hay varias)
3. Explora las categorias de productos
4. Cada producto muestra nombre, descripcion y precio

Los productos se muestran segun disponibilidad del dia.`,
      },
      {
        id: 'horarios',
        title: 'Horarios de la cafeteria',
        content: `La cafeteria tiene diferentes horarios de atencion:

- Desayuno: 7:00 - 9:00
- Almuerzo: 12:00 - 14:00
- Once: 15:00 - 17:00

Los horarios pueden variar segun el colegio. Consulta con la administracion del colegio para horarios especificos.`,
      },
    ],
  },
  {
    id: 'tickets',
    name: 'Tickets y Pagos',
    icon: '🎟️',
    description: 'Compra de tickets y metodos de pago',
    articles: [
      {
        id: 'comprar-tickets',
        title: 'Como comprar tickets',
        content: `Para comprar tickets para un estudiante:

1. Ve a la pantalla principal
2. Selecciona el estudiante
3. Toca el boton "Recargar"
4. Selecciona un paquete de tickets
5. Selecciona el metodo de pago (WebPay, transferencia, etc.)
6. Completa el proceso de pago

Los tickets se agregaran automaticamente una vez confirmado el pago.`,
      },
      {
        id: 'ver-tickets',
        title: 'Como ver los tickets disponibles',
        content: `Puedes ver los tickets de varias formas:

1. En la pantalla principal: Los tickets aparecen debajo del nombre del estudiante seleccionado
2. En la lista de estudiantes: Cada estudiante muestra sus tickets disponibles
3. En el historial de tickets: Puedes ver las compras y consumos

Los tickets se actualizan en tiempo real con cada compra o consumo.`,
      },
      {
        id: 'historial-tickets',
        title: 'Ver historial de tickets',
        content: `Para ver el historial de tickets:

1. Ve a la pestaña "Historial"
2. Usa los filtros para buscar por:
   - Estudiante
   - Mes
   - Tipo de movimiento

Cada movimiento muestra:
- Fecha y hora
- Tipo (compra de tickets, consumo)
- Cantidad de tickets`,
      },
    ],
  },
  {
    id: 'cuenta',
    name: 'Mi Cuenta',
    icon: '👤',
    description: 'Perfil, configuracion y estudiantes',
    articles: [
      {
        id: 'editar-perfil',
        title: 'Como editar mi perfil',
        content: `Para editar tu informacion personal:

1. Ve a la pestaña "Perfil"
2. Toca el boton "Editar Perfil"
3. Modifica los campos que necesites:
   - Nombre
   - Telefono
   - RUT
4. Guarda los cambios

Tu correo electronico no puede ser modificado.`,
      },
      {
        id: 'agregar-estudiante',
        title: 'Como agregar un estudiante',
        content: `Para agregar un nuevo estudiante a tu cuenta:

1. Ve a la pantalla principal o "Ver Estudiantes"
2. Toca el boton "Agregar Estudiante"
3. Ingresa los datos del estudiante:
   - RUT del estudiante
   - El sistema buscara al estudiante en la base de datos del colegio
4. Confirma la asociacion

El estudiante quedara vinculado a tu cuenta y podras gestionar sus tickets y pedidos.`,
      },
    ],
  },
  {
    id: 'notificaciones',
    name: 'Notificaciones',
    icon: '🔔',
    description: 'Alertas y centro de notificaciones',
    articles: [
      {
        id: 'tipos-notificaciones',
        title: 'Tipos de notificaciones',
        content: `Recibiras notificaciones automaticas cuando:

- Tu hijo realice una compra
- Los tickets esten por agotarse
- El estado de un pedido cambie
- Haya promociones o novedades

Puedes ver todas tus notificaciones tocando el icono de campana en la pantalla principal.`,
      },
      {
        id: 'gestionar-notificaciones',
        title: 'Gestionar notificaciones',
        content: `En el Centro de Notificaciones puedes:

- Ver todas tus notificaciones
- Marcar notificaciones como leidas
- Marcar todas como leidas
- Tocar una notificacion para ir a la pantalla relacionada

Las notificaciones no leidas se muestran destacadas con un indicador azul.`,
      },
    ],
  },
];

interface Article {
  id: string;
  title: string;
  content: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  articles: Article[];
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const handleCategoryPress = (category: Category) => {
    setSelectedCategory(category);
    setSelectedArticle(null);
  };

  const handleArticlePress = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      router.back();
    }
  };

  // Filter articles based on search
  const searchResults = searchQuery.trim()
    ? helpCategories.flatMap(cat =>
        cat.articles.filter(
          article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(article => ({ ...article, categoryName: cat.name }))
      )
    : [];

  // Render article content
  if (selectedArticle) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            onPress={handleBack}
            iconColor={colors.textPrimary}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerSubtitle}>{selectedCategory?.name}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedArticle.title}</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.articleContent}>
          {/* Breadcrumbs */}
          <View style={styles.breadcrumbs}>
            <TouchableOpacity onPress={() => { setSelectedCategory(null); setSelectedArticle(null); }}>
              <Text style={styles.breadcrumbLink}>Centro de Ayuda</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSeparator}> › </Text>
            <TouchableOpacity onPress={() => setSelectedArticle(null)}>
              <Text style={styles.breadcrumbLink}>{selectedCategory?.name}</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSeparator}> › </Text>
            <Text style={styles.breadcrumbCurrent} numberOfLines={1}>{selectedArticle.title}</Text>
          </View>

          <Text style={styles.articleTitle}>{selectedArticle.title}</Text>
          <Text style={styles.articleBody}>{selectedArticle.content}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render category articles list
  if (selectedCategory) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            onPress={handleBack}
            iconColor={colors.textPrimary}
          />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{selectedCategory.name}</Text>
            <Text style={styles.headerSubtitle}>{selectedCategory.articles.length} articulos</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Breadcrumbs */}
          <View style={styles.breadcrumbs}>
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Text style={styles.breadcrumbLink}>Centro de Ayuda</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSeparator}> › </Text>
            <Text style={styles.breadcrumbCurrent}>{selectedCategory.name}</Text>
          </View>

          {selectedCategory.articles.map(article => (
            <TouchableOpacity
              key={article.id}
              onPress={() => handleArticlePress(article)}
              activeOpacity={0.7}
            >
              <Surface style={styles.articleCard} elevation={1}>
                <Text style={styles.articleCardTitle}>{article.title}</Text>
                <Text style={styles.articlePreview} numberOfLines={2}>
                  {article.content}
                </Text>
                <Text style={styles.readMore}>Leer mas →</Text>
              </Surface>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render main help center with categories
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          onPress={handleBack}
          iconColor={colors.textPrimary}
        />
        <Text style={styles.title}>Centro de Ayuda</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <Searchbar
          placeholder="Buscar en ayuda..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />

        {/* Search Results */}
        {searchQuery.trim() && (
          <View style={styles.searchResults}>
            <Text style={styles.sectionTitle}>
              {searchResults.length} resultado(s) para "{searchQuery}"
            </Text>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={`${result.id}-${index}`}
                onPress={() => {
                  const category = helpCategories.find(c => c.name === result.categoryName);
                  if (category) {
                    setSelectedCategory(category);
                    setSelectedArticle(result);
                    setSearchQuery('');
                  }
                }}
                activeOpacity={0.7}
              >
                <Surface style={styles.searchResultCard} elevation={1}>
                  <Text style={styles.searchResultCategory}>{result.categoryName}</Text>
                  <Text style={styles.searchResultTitle}>{result.title}</Text>
                </Surface>
              </TouchableOpacity>
            ))}
            {searchResults.length === 0 && (
              <Text style={styles.noResultsText}>
                No se encontraron resultados. Intenta con otros terminos.
              </Text>
            )}
          </View>
        )}

        {/* Categories */}
        {!searchQuery.trim() && (
          <>
            <Text style={styles.sectionTitle}>Categorias</Text>
            {helpCategories.map(category => (
              <TouchableOpacity
                key={category.id}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <Surface style={styles.categoryCard} elevation={1}>
                  <View style={styles.categoryIcon}>
                    <Text style={styles.categoryIconText}>{category.icon}</Text>
                  </View>
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                    <Text style={styles.categoryArticleCount}>
                      {category.articles.length} articulo(s)
                    </Text>
                  </View>
                  <Text style={styles.categoryArrow}>›</Text>
                </Surface>
              </TouchableOpacity>
            ))}

            {/* Contact Support */}
            <Surface style={styles.contactCard} elevation={1}>
              <Text style={styles.contactTitle}>¿No encontraste lo que buscabas?</Text>
              <Text style={styles.contactText}>
                Si tienes alguna pregunta que no esta cubierta en nuestro centro de ayuda,
                no dudes en contactarnos.
              </Text>
              <Text style={styles.contactEmail}>soporte@tapincolegios.cl</Text>
            </Surface>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  searchBar: {
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  categoryIconText: {
    fontSize: 24,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  categoryArticleCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  categoryArrow: {
    fontSize: 24,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  articleCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  articleCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  articlePreview: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  readMore: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  articleContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  articleTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  articleBody: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  searchResults: {
    marginBottom: spacing.lg,
  },
  searchResultCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  searchResultCategory: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  contactCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  contactEmail: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  breadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    fontSize: 13,
    color: colors.textMuted,
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
});
