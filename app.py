import os
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
from flask_migrate import Migrate
from database import db
from datetime import datetime
import json
import logging

# Configuración de logging
logging.basicConfig(level=logging.DEBUG)

# Crear la aplicación Flask
app = Flask(__name__)
socketio = SocketIO(app)

# Configuración
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL") or "postgresql://postgres:123456@localhost/burger-app"
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Inicializar la app con la extensión
db.init_app(app)
migrate = Migrate(app, db)

# Importar modelos
from models import Product, Order, OrderItem, Inventory, ProductIngredient, UserPreferences, Feedback, SalesStats, Category

# Rutas del panel de administración
@app.route('/admin')
def admin_dashboard():
    return render_template('admin/dashboard.html')

@app.route('/admin/products')
def admin_products():
    return render_template('admin/products.html')

@app.route('/admin/inventory')
def admin_inventory():
    return render_template('admin/inventory.html')

@app.route('/admin/stats')
def admin_stats():
    return render_template('admin/stats.html')

@app.route('/admin/categories')
def admin_categories():
    return render_template('admin/categories.html')



# Rutas principales
@app.route('/')
@app.route('/menu')
def menu():
    return render_template('menu.html')

@app.route('/orders')
def orders():
    return render_template('orders.html')

@app.route('/kitchen')
def kitchen():
    return render_template('kitchen.html')

@app.route('/stats')
def stats():
    return render_template('stats.html')

@app.route('/inventory')
def inventory():
    return render_template('inventory.html')

# API Routes para Inventario
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    try:
        items = Inventory.query.all()
        low_stock_count = sum(1 for item in items if item.needs_restock())
        
        return jsonify({
            'items': [{
                'id': item.id,
                'name': item.name,
                'quantity': item.quantity,
                'unit': item.unit,
                'minimum_stock': item.minimum_stock,
                'category': item.category,
                'last_restock': item.last_restock.isoformat() if item.last_restock else None
            } for item in items],
            'lowStockCount': low_stock_count,
            'totalItems': len(items)
        })
    except Exception as e:
        app.logger.error(f"Error getting inventory: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory', methods=['POST'])
def create_inventory_item():
    try:
        data = request.json
        item = Inventory(
            name=data['name'],
            quantity=float(data['quantity']),
            unit=data['unit'],
            minimum_stock=float(data['minimum_stock']),
            category=data['category']
        )
        db.session.add(item)
        db.session.commit()
        return jsonify({
            'id': item.id,
            'name': item.name,
            'quantity': item.quantity,
            'unit': item.unit,
            'minimum_stock': item.minimum_stock,
            'category': item.category
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating inventory item: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory/<int:item_id>/stock', methods=['PUT'])
def update_inventory_stock(item_id):
    try:
        item = Inventory.query.get_or_404(item_id)
        data = request.json
        item.quantity += float(data['quantity'])
        item.last_restock = datetime.utcnow()
        db.session.commit()
        return jsonify({
            'id': item.id,
            'quantity': item.quantity,
            'last_restock': item.last_restock.isoformat()
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating inventory stock: {str(e)}")
        return jsonify({'error': str(e)}), 500

# API Routes para Productos
@app.route('/api/products/all', methods=['GET'])
def get_all_products():
    try:
        products = Product.query.all()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'description': p.description,
            'image': p.image,
            'price': p.price,
            'category': p.category.name,
            'available': p.available,
            'stock': p.stock,
        } for p in products])
    except Exception as e:
        app.logger.error(f"Error getting all products: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['POST'])
def create_product():
    try:
        data = request.json
        product = Product(
            name=data['name'],
            description=data.get('description', ''),
            image = data.get('image', ''),
            price=float(data['price']),
            category_id=int(data.get('category')),
            available=data.get('available', True),
            stock=int(data.get('stock', 0))
        )
        db.session.add(product)
        db.session.commit()
        return jsonify({
            'id': product.id,
            'name': product.name,
            'image': product.image,
            'description': product.description,
            'price': product.price,
            'category': product.category.name,
            'available': product.available,
            'stock': product.stock
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating product: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.json
        
        product.name = data['name']
        product.description = data.get('description', '')
        product.image = data.get('image', '')
        product.price = float(data['price'])
        product.category_id = int(data['category'])
        product.available = data.get('available', True)
        product.stock = int(data.get('stock', 0))
        
        db.session.commit()
        return jsonify({
            'id': product.id,
            'name': product.name,
            'description': product.description,
            'image': product.image,
            'price': product.price,
            'category': product.category.name,
            'available': product.available,
            'stock': product.stock
        })
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating product: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product deleted successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting product: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    try:
        data = request.json
        order = Order.query.get_or_404(order_id)
        
        try:
            order.update_status(data['status'])
            db.session.commit()
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 400
            
        socketio.emit('order_status_changed', order.to_dict())
        return jsonify(order.to_dict())
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating order status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_orders():
    try:
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify([order.to_dict() for order in orders])
    except Exception as e:
        app.logger.error(f"Error getting orders: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = Product.query.filter_by(available=True).all()
        app.logger.debug(f"Found {len(products)} available products")
        result = []
        for p in products:
            try:
                product_dict = {
                    'id': p.id,
                    'name': p.name,
                    'description': p.description,
                    'image': p.image,
                    'price': float(p.price),
                    'category_id': p.category_id,
                    'available': p.available,
                    'stock': p.stock,
                    'category': p.category.to_dict() if p.category else None
                }
                result.append(product_dict)
            except Exception as product_error:
                app.logger.error(f"Error serializing product {p.id}: {str(product_error)}")
                continue
                
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error getting products: {str(e)}")
        return jsonify({'error': str(e)}), 500

# API Routes for Loyalty System
@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    customer_name = request.args.get('customer_name')
    if not customer_name:
        return jsonify({'error': 'Customer name is required'}), 400
        
    try:
        # Get or create user preferences
        user_prefs = UserPreferences.query.filter_by(customer_name=customer_name).first()
        if not user_prefs:
            user_prefs = UserPreferences(customer_name=customer_name)
            db.session.add(user_prefs)
            db.session.commit()
        
        # Get available products
        products = Product.query.filter_by(available=True).all()
        
        # Get personalized recommendations
        recommendations = user_prefs.get_recommendations(products)
        
        return jsonify({
            'recommendations': [{
                'id': p.id,
                'name': p.name,
                'description': p.description,
                'price': p.price,
                'category': p.category
            } for p in recommendations]
        })
    except Exception as e:
        app.logger.error(f"Error getting recommendations: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/loyalty/stats/<customer_name>', methods=['GET'])
def get_loyalty_stats(customer_name):
    try:
        user_prefs = UserPreferences.query.filter_by(customer_name=customer_name).first()
        if not user_prefs:
            return jsonify({
                'orderCount': 0,
                'averageRating': None,
                'favoriteCategory': None,
                'lastOrderDate': None
            })
            
        return jsonify({
            'orderCount': user_prefs.order_count,
            'averageRating': round(user_prefs.avg_order_rating, 1) if user_prefs.avg_order_rating else None,
            'favoriteCategory': user_prefs.favorite_category,
            'lastOrderDate': user_prefs.last_order_date.isoformat() if user_prefs.last_order_date else None
        })
    except Exception as e:
        app.logger.error(f"Error getting loyalty stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Regular API Routes
@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    app.logger.debug(f"Received order data: {data}")
    
    try:
        app.logger.debug(f"Creating order for customer: {data['customerName']}")
        # Crear la orden
        order = Order(
            customer_name=data['customerName'],
            customer_phone=data.get('customerPhone', ''),
            status='pending'
        )
        db.session.add(order)
        db.session.flush()  # Obtener el ID de la orden
        
        # Añadir items a la orden
        total_amount = 0
        for item_data in data['items']:
            app.logger.debug(f"Processing item: {item_data}")
            product = Product.query.get(item_data['productId'])
            if not product:
                app.logger.error(f"Product not found with ID: {item_data['productId']}")
                db.session.rollback()
                return jsonify({'error': f"Product {item_data['productId']} not found"}), 404
            
            # Verificar disponibilidad
            if not product.available:
                db.session.rollback()
                return jsonify({'error': f"Product {product.name} is not available"}), 400
                
            customizations = item_data.get('customizations', {})
            if 'extras' in customizations and isinstance(customizations['extras'], list):
                customizations['extras'] = ','.join(customizations['extras'])
            
            order_item = OrderItem(
                order=order,
                product=product,
                quantity=item_data['quantity'],
                customizations=json.dumps(customizations) if customizations else None
            )
            db.session.add(order_item)
            total_amount += product.price * item_data['quantity']
        
        db.session.commit()  # Commit the order and items first
        app.logger.debug(f"Order {order.id} created successfully")
        
        try:
            # Update user preferences
            user_prefs = UserPreferences.query.filter_by(customer_name=data['customerName']).first()
            if not user_prefs:
                user_prefs = UserPreferences(customer_name=data['customerName'])
                db.session.add(user_prefs)
            
            user_prefs.update_preferences(order)
            db.session.commit()
            app.logger.debug(f"User preferences updated for order {order.id}")
        except Exception as e:
            app.logger.error(f"Error updating user preferences: {str(e)}")
            # Continue if user preferences update fails
        
        try:
            # Actualizar estadísticas de ventas
            stats = SalesStats.create_or_update_daily_stats(order)
            db.session.add(stats)
            db.session.commit()
            app.logger.debug(f"Sales stats updated for order {order.id}")
        except Exception as e:
            app.logger.error(f"Error updating sales stats: {str(e)}")
            # Continue if stats update fails
        
        # Emitir eventos de WebSocket
        order_dict = order.to_dict()
        app.logger.debug(f"Emitting WebSocket events for order {order.id}")
        socketio.emit('order_update', order_dict)
        socketio.emit('new_order', order_dict)
        
        # Logging adicional para debug
        app.logger.info(f"Orden {order.id} creada y eventos WebSocket emitidos")
        
        return jsonify(order_dict)
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating order: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/products/ingredients', methods=['GET'])
def get_products_ingredients():
    try:
        products = Product.query.all()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'stock': p.stock,
            'ingredients': [{
                'id': ing.inventory_id,
                'name': ing.ingredient.name,
                'quantity': ing.quantity,
                'unit': ing.ingredient.unit
            } for ing in p.ingredients]
        } for p in products])
    except Exception as e:
        app.logger.error(f"Error getting products ingredients: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>/ingredients', methods=['POST'])
def update_product_ingredients(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.json
        
        # Eliminar ingredientes existentes
        ProductIngredient.query.filter_by(product_id=product_id).delete()
        
        # Añadir nuevos ingredientes
        for ing_data in data['ingredients']:
            ingredient = ProductIngredient(
                product_id=product_id,
                inventory_id=ing_data['ingredientId'],
                quantity=float(ing_data['quantity'])
            )
            db.session.add(ingredient)
        
        # Actualizar stock del producto basado en los ingredientes
        db.session.commit()
        return jsonify({'message': 'Ingredients updated successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating product ingredients: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats/regenerate', methods=['POST'])
def regenerate_stats():
    try:
        app.logger.info("Starting stats regeneration...")
        from models import Order, SalesStats
        # Limpiar estadísticas existentes
        SalesStats.query.delete()
        db.session.commit()
        
        # Obtener todas las órdenes completadas
        completed_orders = Order.query.filter_by(status='completed').order_by(Order.created_at).all()
        app.logger.info(f"Found {len(completed_orders)} completed orders")
        
        # Regenerar estadísticas por cada orden
        for order in completed_orders:
            try:
                stats = SalesStats.create_or_update_daily_stats(order)
                db.session.add(stats)
                app.logger.info(f"Updated stats for order {order.id}")
            except Exception as e:
                app.logger.error(f"Error processing order {order.id}: {str(e)}")
                continue
        
        db.session.commit()
        app.logger.info("Stats regeneration completed successfully")
        return jsonify({'message': 'Sales statistics regenerated successfully'})
    except Exception as e:
        app.logger.error(f"Error regenerating stats: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats/daily', methods=['GET'])
def get_daily_stats():
    try:
        from datetime import date, timedelta
        from models import SalesStats # Import added here
        today = date.today()
        
        # Intentar obtener estadísticas del día
        stats = SalesStats.query.filter_by(date=today).first()
        print(stats)
        if not stats:
            # Si no hay estadísticas para hoy, crear un nuevo registro
            stats = SalesStats(
                date=today,
                total_sales=0.0,
                order_count=0,
                avg_order_value=0.0,
                popular_items=json.dumps({}),
                category_sales=json.dumps({}),
                peak_hours=json.dumps({})
            )
            db.session.add(stats)
            db.session.commit()
        
        # Asegurarse de que todos los campos JSON sean válidos
        try:
            popular_items = json.loads(stats.popular_items) if stats.popular_items else {}
        except json.JSONDecodeError:
            popular_items = {}
            
        try:
            category_sales = json.loads(stats.category_sales) if stats.category_sales else {}
        except json.JSONDecodeError:
            category_sales = {}
            
        try:
            peak_hours = json.loads(stats.peak_hours) if stats.peak_hours else {}
        except json.JSONDecodeError:
            peak_hours = {}
        
        return jsonify({
            'total_sales': float(stats.total_sales or 0),
            'order_count': int(stats.order_count or 0),
            'avg_order_value': float(stats.avg_order_value or 0),
            'popular_items': popular_items,
            'category_sales': category_sales,
            'peak_hours': peak_hours
        })
    except Exception as e:
        app.logger.error(f"Error getting daily stats: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        categories = Category.query.order_by(Category.order).all()
        return jsonify([category.to_dict() for category in categories])
    except Exception as e:
        app.logger.error(f"Error getting categories: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['POST'])
def create_category():
    try:
        data = request.json
        category = Category(
            name=data['name'],
            description=data.get('description', ''),
            icon=data.get('icon', 'bi-tag'),
            order=data.get('order', 0),
            active=data.get('active', True)
        )
        db.session.add(category)
        db.session.commit()
        return jsonify(category.to_dict())
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating category: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        data = request.json
        
        category.name = data['name']
        category.description = data.get('description', category.description)
        category.icon = data.get('icon', category.icon)
        category.order = data.get('order', category.order)
        category.active = data.get('active', category.active)
        
        db.session.commit()
        return jsonify(category.to_dict())
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating category: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        db.session.delete(category)
        db.session.commit()
        return jsonify({'message': 'Category deleted successfully'})
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting category: {str(e)}")
        return jsonify({'error': str(e)}), 500
@app.route('/api/stats/weekly', methods=['GET'])
def get_weekly_stats():
    try:
        from datetime import date, timedelta
        from models import SalesStats # Import added here
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
        
        stats = SalesStats.query.filter(
            SalesStats.date.between(start_date, end_date)
        ).all()
        
        return jsonify([{
            'date': stat.date.isoformat(),
            'total_sales': stat.total_sales,
            'order_count': stat.order_count,
            'avg_order_value': stat.avg_order_value,
            'popular_items': json.loads(stat.popular_items or '{}'),
            'category_sales': json.loads(stat.category_sales or '{}'),
            'peak_hours': json.loads(stat.peak_hours or '{}')
        } for stat in stats])
    except Exception as e:
        app.logger.error(f"Error getting weekly stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Inicialización de la base de datos
def init_db():
    with app.app_context():
        try:
            db.create_all()
            # Ejecutar migraciones si es necesario
            from flask_migrate import upgrade
            upgrade()
        except Exception as e:
            app.logger.error(f"Error initializing database: {str(e)}")
            raise

if __name__ == '__main__':
    init_db()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)