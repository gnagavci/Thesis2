

const API_BASE_URL = "/api"; 

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers, 
      ...(token && { Authorization: `Bearer ${token}` }), 
    }
  };

  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
};




