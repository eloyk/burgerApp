// Feedback handling
let selectedRating = null;
let currentOrderId = null;

function showFeedbackModal(orderId) {
    currentOrderId = orderId;
    selectedRating = null;
    const modal = new bootstrap.Modal(document.getElementById('feedbackModal'));
    
    // Reset form
    document.getElementById('feedbackComment').value = '';
    document.getElementById('submitFeedback').disabled = true;
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    modal.show();
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Rating button clicks
    document.querySelectorAll('.rating-btn').forEach(button => {
        button.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            
            // Update button states
            document.querySelectorAll('.rating-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Enable submit button
            document.getElementById('submitFeedback').disabled = false;
        });
    });
    
    // Submit feedback
    document.getElementById('submitFeedback').addEventListener('click', async function() {
        if (!selectedRating || !currentOrderId) return;
        
        try {
            const response = await fetch(`/api/orders/${currentOrderId}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: selectedRating,
                    comment: document.getElementById('feedbackComment').value
                })
            });
            
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('feedbackModal'));
                modal.hide();
                alert('¡Gracias por tu feedback!');
            } else {
                throw new Error('Error al enviar el feedback');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
});
