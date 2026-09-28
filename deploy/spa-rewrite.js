// CloudFront Function (viewer-request) asociada SOLO al comportamiento por
// defecto, el que sirve el frontend desde S3.
//
// Sirve para que los enlaces profundos del SPA funcionen: al recargar
// /proyectos/12 el navegador pide esa ruta a S3, donde no existe ningún objeto.
// En lugar de responder un error, se reescribe a /index.html y React Router
// resuelve la vista en el cliente.
//
// Es importante que esta reescritura viva en una función y NO en un
// CustomErrorResponse de la distribución: un 403 del API (por ejemplo el que
// devuelve el RBAC cuando el rol no tiene permiso) también quedaría convertido
// en el index.html con estado 200 y el frontend nunca vería el error real.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var ultimoSegmento = uri.split('/').pop();

  // Los archivos reales (assets con hash, favicon, etc.) llevan extensión.
  if (ultimoSegmento.indexOf('.') === -1) {
    request.uri = '/index.html';
  }

  return request;
}
