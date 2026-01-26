'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Mail, ChevronRight, UtensilsCrossed, Store, Ticket, User, Bell } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  title: string;
  content: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  articles: Article[];
}

const helpCategories: Category[] = [
  {
    id: 'pedidos',
    name: 'Pedidos',
    icon: <UtensilsCrossed className="h-6 w-6 text-primary" />,
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
    icon: <Store className="h-6 w-6 text-primary" />,
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
    icon: <Ticket className="h-6 w-6 text-primary" />,
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
    icon: <User className="h-6 w-6 text-primary" />,
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
    icon: <Bell className="h-6 w-6 text-primary" />,
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

export default function HelpPage() {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-text-secondary hover:text-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-text-secondary">{selectedCategory?.name}</p>
            <h1 className="text-xl font-bold text-text">{selectedArticle.title}</h1>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm pb-4 border-b border-border flex-wrap">
          <button
            onClick={() => { setSelectedCategory(null); setSelectedArticle(null); }}
            className="text-primary hover:underline"
          >
            Centro de Ayuda
          </button>
          <span className="text-text-secondary">/</span>
          <button
            onClick={() => setSelectedArticle(null)}
            className="text-primary hover:underline"
          >
            {selectedCategory?.name}
          </button>
          <span className="text-text-secondary">/</span>
          <span className="text-text-secondary truncate">{selectedArticle.title}</span>
        </div>

        {/* Article Content */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-text mb-6">{selectedArticle.title}</h2>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-text leading-relaxed">
              {selectedArticle.content}
            </pre>
          </div>
        </Card>
      </div>
    );
  }

  // Render category articles list
  if (selectedCategory) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-text-secondary hover:text-text"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text">{selectedCategory.name}</h1>
            <p className="text-sm text-text-secondary">{selectedCategory.articles.length} articulos</p>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm pb-4 border-b border-border">
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-primary hover:underline"
          >
            Centro de Ayuda
          </button>
          <span className="text-text-secondary">/</span>
          <span className="text-text-secondary">{selectedCategory.name}</span>
        </div>

        {/* Articles List */}
        <div className="space-y-3">
          {selectedCategory.articles.map(article => (
            <button
              key={article.id}
              onClick={() => handleArticlePress(article)}
              className="w-full text-left"
            >
              <Card className="p-4 hover:border-primary/50 transition-colors">
                <h3 className="font-semibold text-text mb-2">{article.title}</h3>
                <p className="text-sm text-text-secondary line-clamp-2">{article.content}</p>
                <p className="text-sm text-primary mt-2">Leer mas →</p>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Render main help center with categories
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-text-secondary hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-text">Centro de Ayuda</h1>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
        <input
          type="text"
          placeholder="Buscar en ayuda..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="space-y-3">
          <h3 className="font-semibold text-text">
            {searchResults.length} resultado(s) para "{searchQuery}"
          </h3>
          {searchResults.map((result, index) => (
            <button
              key={`${result.id}-${index}`}
              onClick={() => {
                const category = helpCategories.find(c => c.name === result.categoryName);
                if (category) {
                  setSelectedCategory(category);
                  setSelectedArticle(result);
                  setSearchQuery('');
                }
              }}
              className="w-full text-left"
            >
              <Card className="p-4 hover:border-primary/50 transition-colors">
                <p className="text-xs font-semibold text-primary uppercase mb-1">
                  {result.categoryName}
                </p>
                <p className="font-medium text-text">{result.title}</p>
              </Card>
            </button>
          ))}
          {searchResults.length === 0 && (
            <p className="text-text-secondary text-center py-6">
              No se encontraron resultados. Intenta con otros terminos.
            </p>
          )}
        </div>
      )}

      {/* Categories */}
      {!searchQuery.trim() && (
        <>
          <h3 className="font-semibold text-text">Categorias</h3>
          <div className="space-y-3">
            {helpCategories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryPress(category)}
                className="w-full text-left"
              >
                <Card className="p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-text">{category.name}</h4>
                      <p className="text-sm text-text-secondary">{category.description}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {category.articles.length} articulo(s)
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                  </div>
                </Card>
              </button>
            ))}
          </div>

          {/* Contact Support */}
          <Card className="p-6 bg-primary/5 text-center">
            <h3 className="font-semibold text-text mb-2">
              ¿No encontraste lo que buscabas?
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Si tienes alguna pregunta que no esta cubierta en nuestro centro de ayuda,
              no dudes en contactarnos.
            </p>
            <a
              href="mailto:soporte@tapincolegios.cl"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            >
              <Mail className="h-4 w-4" />
              soporte@tapincolegios.cl
            </a>
          </Card>
        </>
      )}
    </div>
  );
}
