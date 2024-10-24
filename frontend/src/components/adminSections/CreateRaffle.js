import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';
import '../../assets/styles/adminSections/CreateRaffle.css';

const CreateRaffle = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    price: '',
    totalTickets: '1000',
    productImage: null // Changed to null for file upload
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [validation, setValidation] = useState({
    productName: true,
    description: true,
    price: true,
    totalTickets: true,
    productImage: true
  });

  const validateForm = () => {
    const newValidation = {
      productName: formData.productName.length >= 3,
      description: formData.description.length >= 10,
      price: parseFloat(formData.price) > 0,
      totalTickets: parseInt(formData.totalTickets) >= 10,
      productImage: formData.productImage !== null
    };

    setValidation(newValidation);
    return Object.values(newValidation).every(Boolean);
  };

  const errorMessages = {
    productName: 'El nombre debe tener al menos 3 caracteres',
    description: 'La descripción debe tener al menos 10 caracteres',
    price: 'El precio debe ser mayor a 0',
    totalTickets: 'Debe haber al menos 10 tickets',
    productImage: 'La imagen es requerida'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
    setValidation(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        productImage: file
      }));

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      setValidation(prev => ({
        ...prev,
        productImage: true
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (!validateForm()) {
      setError('Por favor, complete todos los campos correctamente.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Create FormData object for multipart/form-data
      const submitFormData = new FormData();
      submitFormData.append('productName', formData.productName);
      submitFormData.append('description', formData.description);
      submitFormData.append('price', formData.price);
      submitFormData.append('totalTickets', formData.totalTickets);
      submitFormData.append('productImage', formData.productImage);

      const response = await axios.post(
        'http://localhost:5000/api/raffle/create',
        submitFormData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      socket.emit('raffle_created', response.data);

      setSuccess(true);
      setFormData({
        productName: '',
        description: '',
        price: '',
        totalTickets: '1000',
        productImage: null
      });
      setImagePreview(null);

      setTimeout(() => {
        navigate('/admin/active-raffles');
      }, 2000);

    } catch (error) {
      console.error('Error creating raffle:', error);
      setError(
        error.response?.data?.message || 
        'Error al crear la rifa. Por favor, intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-raffle">
      <h2 className="page-title">Crear Nueva Rifa</h2>
      <p className="page-description">Configurar un nuevo evento de rifa</p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">¡Rifa creada exitosamente! Redirigiendo...</div>}

      <div className="form-container">
        <form onSubmit={handleSubmit} className="raffle-form">
          <div className="form-group">
            <label htmlFor="productName">Nombre del Producto</label>
            <input
              type="text"
              id="productName"
              name="productName"
              placeholder="Ingrese el nombre del producto"
              value={formData.productName}
              onChange={handleInputChange}
              className={!validation.productName ? 'invalid' : ''}
              required
            />
            {!validation.productName && (
              <span className="error-text">{errorMessages.productName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              placeholder="Ingrese la descripción del producto"
              value={formData.description}
              onChange={handleInputChange}
              className={!validation.description ? 'invalid' : ''}
              required
            />
            {!validation.description && (
              <span className="error-text">{errorMessages.description}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Precio por Ticket (USD)</label>
              <input
                type="number"
                id="price"
                name="price"
                placeholder="Ingrese el precio"
                value={formData.price}
                onChange={handleInputChange}
                className={!validation.price ? 'invalid' : ''}
                min="0.01"
                step="0.01"
                required
              />
              {!validation.price && (
                <span className="error-text">{errorMessages.price}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="totalTickets">Cantidad Total de Tickets</label>
              <input
                type="number"
                id="totalTickets"
                name="totalTickets"
                placeholder="Ingrese el total de tickets"
                value={formData.totalTickets}
                onChange={handleInputChange}
                className={!validation.totalTickets ? 'invalid' : ''}
                min="10"
                required
              />
              {!validation.totalTickets && (
                <span className="error-text">{errorMessages.totalTickets}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="productImage">Imagen del Producto</label>
            <input
              type="file"
              id="productImage"
              name="productImage"
              accept="image/*"
              onChange={handleImageChange}
              className={!validation.productImage ? 'invalid' : ''}
              required
            />
            {!validation.productImage && (
              <span className="error-text">{errorMessages.productImage}</span>
            )}
          </div>

          {imagePreview && (
            <div className="image-preview">
              <img
                src={imagePreview}
                alt="Vista previa"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-image.jpg';
                }}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Rifa'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRaffle;
