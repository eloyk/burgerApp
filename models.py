from database import db
from datetime import datetime, date
import json

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50), default='bi-tag')
    order = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    products = db.relationship('Product', back_populates='category', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'order': self.order,
            'active': self.active
        }

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    available = db.Column(db.Boolean, default=True)
    stock = db.Column(db.Integer, default=0)
    ingredients = db.relationship('ProductIngredient', backref='product', lazy=True)
    category = db.relationship('Category', back_populates='products')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'image': self.image,
            'price': float(self.price),
            'category_id': self.category_id,
            'category': self.category.to_dict() if self.category else None,
            'available': self.available,
            'stock': self.stock
        }

class Inventory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=0)
    unit = db.Column(db.String(20), nullable=False)
    minimum_stock = db.Column(db.Float, nullable=False, default=10)
    last_restock = db.Column(db.DateTime, default=datetime.utcnow)
    category = db.Column(db.String(50))
    products = db.relationship('ProductIngredient', backref='ingredient', lazy=True)
    
    def needs_restock(self):
        return self.quantity <= self.minimum_stock

class ProductIngredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    inventory_id = db.Column(db.Integer, db.ForeignKey('inventory.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(20))
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=date.today())
    accepted_at = db.Column(db.DateTime)
    preparing_at = db.Column(db.DateTime)
    ready_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    items = db.relationship('OrderItem', backref='order', lazy=True)

    def update_status(self, new_status):
        import logging
        logging.info(f"Actualizando estado del pedido #{self.id} de {self.status} a {new_status}")
        
        if new_status == 'preparing' and self.status == 'pending':
            logging.info(f"Verificando inventario para pedido #{self.id}")
            try:
                if not self.check_inventory():
                    logging.error(f"Inventario insuficiente para pedido #{self.id}")
                    raise ValueError("No hay suficiente inventario para procesar este pedido")
                    
                logging.info(f"Inventario verificado, actualizando para pedido #{self.id}")
                self.update_inventory()
                logging.info(f"Inventario actualizado exitosamente para pedido #{self.id}")
            except Exception as e:
                logging.error(f"Error al procesar inventario: {str(e)}")
                raise
            
        self.status = new_status
        timestamp_field = f"{new_status}_at"
        if hasattr(self, timestamp_field):
            setattr(self, timestamp_field, datetime.utcnow())
            logging.info(f"Timestamp {timestamp_field} actualizado para pedido #{self.id}")
            
    def check_inventory(self):
        for item in self.items:
            for ingredient in item.product.ingredients:
                inventory_item = ingredient.ingredient
                required_quantity = ingredient.quantity * item.quantity
                if inventory_item.quantity < required_quantity:
                    return False
        return True
        
    def update_inventory(self):
        import logging
        logging.info(f"Actualizando inventario para pedido #{self.id}")
        
        for item in self.items:
            logging.info(f"Procesando item: {item.product.name} x{item.quantity}")
            if not item.product.ingredients:
                logging.warning(f"Producto {item.product.name} no tiene ingredientes definidos")
                continue
                
            for ingredient in item.product.ingredients:
                inventory_item = ingredient.ingredient
                required_quantity = ingredient.quantity * item.quantity
                logging.info(f"Descontando {required_quantity} {inventory_item.unit} de {inventory_item.name}")
                
                if inventory_item.quantity < required_quantity:
                    logging.error(f"Inventario insuficiente de {inventory_item.name}")
                    raise ValueError(f"No hay suficiente {inventory_item.name} en inventario")
                    
                inventory_item.quantity -= required_quantity
                logging.info(f"Nuevo stock de {inventory_item.name}: {inventory_item.quantity} {inventory_item.unit}")
                
                if inventory_item.needs_restock():
                    logging.warning(f"Stock bajo de {inventory_item.name}: {inventory_item.quantity} {inventory_item.unit}")

    def to_dict(self):
        return {
            'id': self.id,
            'customerName': self.customer_name,
            'customerPhone': self.customer_phone,
            'status': self.status,
            'createdAt': self.created_at.isoformat(),
            'acceptedAt': self.accepted_at.isoformat() if self.accepted_at else None,
            'preparingAt': self.preparing_at.isoformat() if self.preparing_at else None,
            'readyAt': self.ready_at.isoformat() if self.ready_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'items': [item.to_dict() for item in self.items]
        }

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    customizations = db.Column(db.Text)
    product = db.relationship('Product')

    def to_dict(self):
        customizations = json.loads(self.customizations) if self.customizations else {}
        if 'extras' in customizations and isinstance(customizations['extras'], str):
            customizations['extras'] = customizations['extras'].split(',') if customizations['extras'] else []
        return {
            'id': self.id,
            'productId': self.product_id,
            'productName': self.product.name,
            'quantity': self.quantity,
            'customizations': customizations
        }

class UserPreferences(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), nullable=False, unique=True)
    favorite_category = db.Column(db.String(50), nullable=True)
    last_order_date = db.Column(db.DateTime)
    order_count = db.Column(db.Integer, default=0)
    avg_order_rating = db.Column(db.Float)
    preferred_customizations = db.Column(db.Text)
    total_spent = db.Column(db.Float, default=0.0)

    def update_preferences(self, order, rating=None):
        self.last_order_date = order.created_at
        self.order_count = (self.order_count or 0) + 1
        
        # Update total spent
        order_total = sum(item.product.price * item.quantity for item in order.items)
        self.total_spent = (self.total_spent or 0.0) + order_total
        
        # Update favorite category based on order items
        categories = {}
        for item in order.items:
            category = item.product.category
            if category not in categories:
                categories[category] = 0
            categories[category] += item.quantity
        
        if categories:
            most_ordered_category = max(categories.items(), key=lambda x: x[1])[0]
            self.favorite_category = most_ordered_category.name if most_ordered_category else None
        
        # Update customization preferences
        customizations = {}
        for item in order.items:
            if item.customizations:
                try:
                    item_customs = json.loads(item.customizations)
                    for key, value in item_customs.items():
                        if key not in customizations:
                            customizations[key] = {}
                        if isinstance(value, list):
                            for v in value:
                                customizations[key][v] = customizations[key].get(v, 0) + 1
                        else:
                            customizations[key][str(value)] = customizations[key].get(str(value), 0) + 1
                except json.JSONDecodeError:
                    continue
        
        if customizations:
            self.preferred_customizations = json.dumps(customizations)
        
        if rating is not None:
            if self.avg_order_rating is None:
                self.avg_order_rating = float(rating)
            else:
                self.avg_order_rating = ((self.avg_order_rating * (self.order_count - 1)) + rating) / self.order_count

class SalesStats(db.Model):
    __tablename__ = 'sales_stats'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True, index=True)
    total_sales = db.Column(db.Float, default=0.0)
    order_count = db.Column(db.Integer, default=0)
    avg_order_value = db.Column(db.Float, default=0.0)
    popular_items = db.Column(db.Text, default='{}')
    peak_hours = db.Column(db.Text, default='{}')
    category_sales = db.Column(db.Text, default='{}')
    
    @staticmethod
    def create_or_update_daily_stats(order):
        from datetime import date
        import logging
        
        try:
            order_date = order.created_at.date()
            stats = SalesStats.query.filter_by(date=order_date).first()
            
            if not stats:
                stats = SalesStats(date=order_date)
                db.session.add(stats)
                logging.info(f"Created new stats for date {order_date}")
            
            order_total = sum(item.product.price * item.quantity for item in order.items)
            
            stats.total_sales = float(stats.total_sales or 0) + order_total
            stats.order_count = (stats.order_count or 0) + 1
            stats.avg_order_value = stats.total_sales / stats.order_count
            
            try:
                category_sales = json.loads(stats.category_sales) if stats.category_sales else {}
            except json.JSONDecodeError:
                category_sales = {}
                
            for item in order.items:
                category = item.product.category
                if category:
                    category_key = str(category.id)
                    if category_key not in category_sales:
                        category_sales[category_key] = {
                            'name': category.name,
                            'total': 0.0
                        }
                category_sales[category_key]['total'] = float(category_sales[category_key]['total']) + (item.product.price * item.quantity)
            stats.category_sales = json.dumps(category_sales)
            
            try:
                popular_items = json.loads(stats.popular_items) if stats.popular_items else {}
            except json.JSONDecodeError:
                popular_items = {}
                
            for item in order.items:
                item_key = str(item.product.id)
                if item_key not in popular_items:
                    popular_items[item_key] = {
                        'name': item.product.name,
                        'count': 0,
                        'total': 0.0
                    }
                popular_items[item_key]['count'] += item.quantity
                popular_items[item_key]['total'] = float(popular_items[item_key]['total']) + (item.product.price * item.quantity)
            stats.popular_items = json.dumps(popular_items)
            
            try:
                peak_hours = json.loads(stats.peak_hours) if stats.peak_hours else {}
            except json.JSONDecodeError:
                peak_hours = {}
                
            hour = str(order.created_at.hour)
            peak_hours[hour] = int(peak_hours.get(hour, 0)) + 1
            stats.peak_hours = json.dumps(peak_hours)
            
            logging.info(f"Updated stats for date {order_date}: total_sales={stats.total_sales}, order_count={stats.order_count}")
            return stats
            
        except Exception as e:
            logging.error(f"Error processing stats for order {order.id}: {str(e)}")
            raise

    def get_recommendations(self, products, limit=3):
        if not self.favorite_category:
            return sorted(products, key=lambda p: p.id)[:limit]
        
        def score_product(product):
            score = 0
            if product.category == self.favorite_category:
                score += 5
            
            if self.preferred_customizations and product.category == 'burgers':
                try:
                    customs = json.loads(self.preferred_customizations)
                    if any(k in ['patty', 'extras'] for k in customs.keys()):
                        score += 2
                except:
                    pass
            
            return score
        
        return sorted(products, key=score_product, reverse=True)[:limit]

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id', ondelete='CASCADE'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    order = db.relationship('Order', backref=db.backref('feedback', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'orderId': self.order_id,
            'rating': self.rating,
            'comment': self.comment,
            'createdAt': self.created_at.isoformat()
        }