# -*- coding: utf-8 -*-
"""
Catálogo de dotación de Calor y Frío Industrial.

Es la fuente única: de aquí salen el seed SQL que llena la app y la hoja
imprimible que se guarda en la carpeta de la empresa. Editar el catálogo es
editar esta lista, nunca el SQL ni el Markdown, que se regeneran.

Las notas que citan páginas vienen del curso «Buenas Prácticas en Refrigeración
y Climatización» (Unidad Ozono, Ministerio del Medio Ambiente, Chile 2018), que
está en «09 Conocimiento Técnico/Normativa y Buenas Prácticas».

Banderas:
  k  crítico: sin esto no se puede trabajar, o lo exige la norma
  c  consumible: se gasta y se repone
  q  ya estaba en la lista de cotizaciones de junio 2026
Ámbitos:
  T  cada técnico tiene el suyo        E  uno para la empresa (taller)
  V  va en la camioneta
"""
import io
import os

PULGADA = '"'

# (código, nombre, ámbito, cantidad, unidad, banderas, nota)
CATEGORIAS = [
("COR", "Corte y preparación de cañería", [
 ("COR-01", "Cortatubos de 1/8 a 1 1/8 pulgada", "T", 1, "unidad", "k",
  "El corte debe ser a escuadra; la sierra deja rebaba y limalla dentro del circuito (p132)."),
 ("COR-02", "Cortatubos miniatura para espacios estrechos", "T", 1, "unidad", "",
  "Detrás de una evaporadora ya montada no entra el grande."),
 ("COR-03", "Cortacapilar", "T", 1, "unidad", "", ""),
 ("COR-04", "Escariador o rimador de tubo", "T", 1, "unidad", "k",
  "La rebaba interior restringe el flujo y suelta limalla al compresor (p133)."),
 ("COR-05", "Esponja abrasiva y lija de tela", "T", 2, "unidad", "c",
  "Limpiar el cobre antes de soldar (p133)."),
 ("COR-06", "Cepillo de acero para cobre", "T", 1, "unidad", "c", ""),
 ("COR-07", "Tapones y capuchones para sellar tubería abierta", "E", 20, "unidad", "c",
  "La cañería abierta toma humedad; sellarla es parte del procedimiento."),
]),
("ABO", "Abocardado, expansión y doblado", [
 ("ABO-01", "Juego abocardador excéntrico 45 grados", "T", 1, "juego", "kq",
  "Expansor cónico (p137). Estaba en la lista de junio como «juego de expandidores»."),
 ("ABO-02", "Kit expandidor recto de copa, 1/4 a 7/8", "T", 1, "juego", "q",
  "Permite unir tubo con tubo sin copla (p139)."),
 ("ABO-03", "Resortes dobladores de 1/4 a 5/8", "T", 1, "juego", "q",
  "Estaban en la lista de junio como «resortes curvadoras» (p140)."),
 ("ABO-04", "Dobladora de palanca con mordazas", "E", 1, "unidad", "",
  "Para radios limpios en diámetros grandes."),
 ("ABO-05", "Llave de torque para tuercas flare", "T", 1, "unidad", "kq",
  "Apretar al torque correcto (p154). El flare mal apretado es la fuga más común en splits."),
 ("ABO-06", "Juego de llaves fijas para flare", "T", 1, "juego", "", ""),
 ("ABO-07", "Pinza de estrangulación", "T", 1, "unidad", "",
  "Cerrar un tubo sin perder la carga (p134)."),
 ("ABO-08", "Extractor de núcleos Schrader con válvula", "T", 1, "unidad", "k",
  "Vaciar y cargar sin sacar el núcleo ni perder refrigerante (p135)."),
]),
("SOL", "Soldadura fuerte y gases", [
 ("SOL-01", "Equipo oxiacetilénico de taller", "E", 1, "equipo", "",
  "Se tienen tres equipos Harris."),
 ("SOL-02", "Equipo oxiacetilénico portátil", "V", 1, "equipo", "", "Para terreno (p141)."),
 ("SOL-03", "Cilindro de oxígeno", "E", 1, "cilindro", "", ""),
 ("SOL-04", "Cilindro de acetileno", "E", 1, "cilindro", "", ""),
 ("SOL-05", "Cilindro de oxígeno portátil", "V", 1, "cilindro", "", ""),
 ("SOL-06", "Cilindro de acetileno portátil", "V", 1, "cilindro", "", ""),
 ("SOL-07", "Reguladores con manómetro para oxígeno y acetileno", "E", 2, "unidad", "k", ""),
 ("SOL-08", "Válvulas antirretorno de llama", "E", 2, "unidad", "k",
  "Evitan el retroceso de llama al cilindro. Es seguridad, no accesorio."),
 ("SOL-09", "Chispero y boquillas de repuesto", "T", 1, "juego", "c", ""),
 ("SOL-10", "Varilla de plata 15 por ciento", "E", 10, "varilla", "c",
  "Cobre contra bronce o acero."),
 ("SOL-11", "Varilla fosfórica sin plata", "E", 20, "varilla", "c",
  "Cobre contra cobre no necesita plata: cuesta una fracción."),
 ("SOL-12", "Fundente para soldadura de plata", "E", 1, "tarro", "c", ""),
 ("SOL-13", "Manta ignífuga o protector de llama", "T", 1, "unidad", "",
  "Soldar contra un muro pintado o un cielo americano sin quemarlo."),
 ("SOL-14", "Extintor PQS de 6 kg vigente", "V", 1, "unidad", "k",
  "El curso lo exige durante la soldadura (p123, y p76 del curso de fugas)."),
]),
("NIT", "Nitrógeno seco", [
 ("NIT-01", "Cilindro de nitrógeno seco", "E", 1, "cilindro", "", ""),
 ("NIT-02", "Manoreductor de nitrógeno 0 a 600 psi", "E", 1, "unidad", "k",
  "Se tiene el cilindro pero no el regulador: sin él no se presuriza a 50 psi ni se mantiene "
  "flujo al soldar (p111, p142, p187)."),
 ("NIT-03", "Acoples rápidos y manguera para nitrógeno", "E", 1, "juego", "", "(p142)"),
 ("NIT-04", "Cilindro de nitrógeno portátil", "V", 1, "cilindro", "",
  "Soldar con flujo de nitrógeno también en terreno (p94, p138)."),
]),
("VAC", "Vacío y carga", [
 ("VAC-01", "Bomba de vacío de dos etapas, 4 CFM o más", "E", 1, "unidad", "", ""),
 ("VAC-02", "Bomba de vacío portátil de 6 CFM", "V", 1, "unidad", "q",
  "Estaba en la lista de junio."),
 ("VAC-03", "Vacuómetro digital de micrones", "T", 1, "unidad", "k",
  "El procedimiento exige bajar de 500 micrones (p180). Los manómetros del árbol de carga no "
  "miden micrones: sin vacuómetro el vacío no se puede acreditar."),
 ("VAC-04", "Árbol de carga de 4 vías", "T", 1, "unidad", "q", "Se tienen dos (p143)."),
 ("VAC-05", "Árbol de carga digital con sondas", "E", 1, "unidad", "",
  "Calcula sobrecalentamiento y subenfriamiento solo; acorta cada diagnóstico."),
 ("VAC-06", "Juego de mangueras de carga con válvula", "T", 1, "juego", "cq",
  "Estaban en la lista de junio."),
 ("VAC-07", "Manguera de vacío de 3/8", "T", 1, "unidad", "",
  "Con manguera de 1/4 el vacío tarda el doble."),
 ("VAC-08", "Adaptadores de 1/4 a 5/16 para R-410A", "T", 2, "unidad", "k",
  "El R-410A usa 5/16: sin adaptador no hay conexión posible."),
 ("VAC-09", "Balanza electrónica de carga hasta 100 kg", "T", 1, "unidad", "k",
  "Cargar por peso y no «al tacto» (p146). Es la causa más común de equipos mal cargados."),
 ("VAC-10", "Banda calefactora para cilindro", "E", 1, "unidad", "", "(p146)"),
 ("VAC-11", "Aceite para bomba de vacío", "E", 2, "litro", "c",
  "Se cambia después de cada trabajo sucio o el vacío no baja."),
]),
("REC", "Recuperación de refrigerante — NCh 3241-2017", [
 ("REC-01", "Recuperadora de refrigerante", "E", 1, "unidad", "k",
  "La NCh 3241-2017 y el curso prohíben liberar refrigerante: «JAMÁS debe liberarse al medio "
  "ambiente» (p220). Sin recuperadora no se puede cambiar un compresor dentro de norma."),
 ("REC-02", "Cilindro de recuperación de 13,6 kg", "E", 1, "cilindro", "k",
  "Prohibido usar cilindros desechables para recuperar; el de recuperación trabaja a 260 psig "
  "(p223)."),
 ("REC-03", "Segundo cilindro de recuperación", "E", 1, "cilindro", "",
  "Un cilindro contiene un solo refrigerante (p225): con uno solo no se atienden dos gases."),
 ("REC-04", "Mangueras y acoples para recuperación", "E", 1, "juego", "", ""),
 ("REC-05", "Identificador de refrigerante", "E", 1, "unidad", "",
  "Evita recuperar una mezcla contaminada que después nadie recibe (p151)."),
]),
("FUG", "Detección de fugas", [
 ("FUG-01", "Detector electrónico de fugas", "T", 1, "unidad", "k",
  "(p98) Es la herramienta del servicio que más se paga sola: la fuga se encuentra o no."),
 ("FUG-02", "Detector para refrigerantes inflamables A2L", "T", 1, "unidad", "",
  "El R-32 y los hidrocarburos requieren detector específico (p117)."),
 ("FUG-03", "Lámpara UV y tinta trazadora", "E", 1, "juego", "", "(p101)"),
 ("FUG-04", "Spray detector de fugas", "T", 1, "unidad", "c", "(p102)"),
 ("FUG-05", "Espejo de inspección y linterna", "T", 1, "juego", "", "(p136)"),
]),
("ELE", "Medición eléctrica", [
 ("ELE-01", "Multímetro True RMS", "T", 1, "unidad", "",
  "Hay uno Fluke: falta el segundo para que cada técnico tenga el suyo (p148)."),
 ("ELE-02", "Pinza amperimétrica", "T", 1, "unidad", "kq",
  "Medir el consumo del compresor es el diagnóstico base. Estaba en la lista de junio."),
 ("ELE-03", "Secuencímetro de rotación de fases", "T", 1, "unidad", "k",
  "(p149) En trifásico, un scroll girando al revés se destruye en segundos."),
 ("ELE-04", "Megóhmetro para aislación de bobinados", "E", 1, "unidad", "",
  "Dice si el compresor está a tierra antes de desarmar nada."),
 ("ELE-05", "Termómetro con termocupla tipo K, dos canales", "T", 1, "unidad", "q",
  "Sobrecalentamiento y subenfriamiento (p147). Estaba en junio como «termocupla termostato»."),
 ("ELE-06", "Termómetro infrarrojo", "T", 1, "unidad", "", ""),
 ("ELE-07", "Probador de capacitores", "T", 1, "unidad", "",
  "Un capacitor caído parece compresor quemado."),
 ("ELE-08", "Buscapolos y probador de continuidad", "T", 1, "unidad", "", ""),
]),
("AIR", "Medición de aire — ventilación", [
 ("AIR-01", "Anemómetro", "T", 1, "unidad", "k",
  "(p150) Sin anemómetro no se entrega un caudal por escrito, y la ventilación es el tercer "
  "oficio del nombre."),
 ("AIR-02", "Termohigrómetro", "T", 1, "unidad", "", "(p150)"),
 ("AIR-03", "Manómetro diferencial de presión", "E", 1, "unidad", "",
  "Caída de presión en filtros y ductos."),
 ("AIR-04", "Sonómetro", "E", 1, "unidad", "",
  "(p150) Para los reclamos por ruido, que en local comercial llegan siempre."),
 ("AIR-05", "Balómetro o campana de caudal", "E", 1, "unidad", "",
  "Cuando haya trabajo de ventilación que lo justifique; es caro."),
]),
("MAN", "Herramientas manuales", [
 ("MAN-01", "Juego de destornilladores plano, philips y torx", "T", 1, "juego", "q", ""),
 ("MAN-02", "Set de perilleros", "T", 1, "juego", "q", ""),
 ("MAN-03", "Juego de llaves allen métricas y en pulgadas", "T", 1, "juego", "q", ""),
 ("MAN-04", "Alicate universal", "T", 1, "unidad", "q", ""),
 ("MAN-05", "Alicate cortante", "T", 1, "unidad", "q", ""),
 ("MAN-06", "Alicate de punta", "T", 1, "unidad", "q", ""),
 ("MAN-07", "Alicate pelacables y crimpeador de terminales", "T", 1, "unidad", "", ""),
 ("MAN-08", "Llave francesa de 8 y de 12 pulgadas", "T", 2, "unidad", "q", ""),
 ("MAN-09", "Juego de llaves de boca y corona", "T", 1, "juego", "", ""),
 ("MAN-10", "Juego de dados con criquet", "T", 1, "juego", "", ""),
 ("MAN-11", "Tijera hojalatera recta, izquierda y derecha", "T", 1, "juego", "q",
  "Ductería y bandejas."),
 ("MAN-12", "Martillo y combo pequeño", "T", 1, "unidad", "", ""),
 ("MAN-13", "Nivel de burbuja de 30 y 60 cm", "T", 1, "juego", "",
  "Una evaporadora fuera de nivel gotea por dentro: es garantía perdida."),
 ("MAN-14", "Huincha de medir de 5 m", "T", 1, "unidad", "", ""),
 ("MAN-15", "Escuadra y lápiz de marcar", "T", 1, "juego", "", ""),
 ("MAN-16", "Cuchillo cartonero", "T", 1, "unidad", "", ""),
 ("MAN-17", "Caja o bolso de herramientas", "T", 1, "unidad", "k",
  "Es lo que hace posible que cada técnico tenga su dotación completa y se sepa qué falta."),
 ("MAN-18", "Banco con tornillo mecánico", "E", 1, "unidad", "", ""),
]),
("MAQ", "Herramientas eléctricas", [
 ("MAQ-01", "Taladro percutor", "E", 1, "unidad", "", ""),
 ("MAQ-02", "Taladro atornillador a batería", "T", 1, "unidad", "k",
  "En terreno no siempre hay dónde enchufar."),
 ("MAQ-03", "Rotomartillo SDS", "E", 1, "unidad", "",
  "Pasar hormigón con percutor normal toma media hora; con SDS, dos minutos."),
 ("MAQ-04", "Amoladora angular de 4 1/2 pulgadas", "E", 1, "unidad", "", ""),
 ("MAQ-05", "Sierra caladora", "E", 1, "unidad", "", ""),
 ("MAQ-06", "Juego de brocas para concreto, metal y madera", "T", 1, "juego", "c", ""),
 ("MAQ-07", "Broca de copa de 65 mm para pasada de muro", "T", 1, "unidad", "k",
  "La pasada de un split es de 65 mm: sin copa se hace a combo y se nota."),
 ("MAQ-08", "Discos de corte y desbaste", "E", 5, "unidad", "c", ""),
 ("MAQ-09", "Aspiradora de sólidos y líquidos", "E", 1, "unidad", "", "Bandejas y desagües."),
]),
("EPP", "Protección personal", [
 ("EPP-01", "Zapato de seguridad", "T", 1, "par", "kq", "(p131)"),
 ("EPP-02", "Ropa de trabajo con la marca", "T", 2, "juego", "kq",
  "Llegar con ropa de empresa a un local es la mitad de la venta."),
 ("EPP-03", "Guantes de cabritilla para soldar", "T", 1, "par", "k", ""),
 ("EPP-04", "Guantes impermeables al refrigerante", "T", 1, "par", "k",
  "El refrigerante líquido congela la piel (p147)."),
 ("EPP-05", "Antiparras con protección lateral", "T", 1, "unidad", "k", "(p147)"),
 ("EPP-06", "Careta o lentes para soldar", "T", 1, "unidad", "k", ""),
 ("EPP-07", "Protección auditiva", "T", 1, "par", "", ""),
 ("EPP-08", "Respirador con filtro", "T", 1, "unidad", "", ""),
 ("EPP-09", "Casco de seguridad", "T", 1, "unidad", "",
  "Sin casco no se entra a una obra ni a una faena."),
 ("EPP-10", "Arnés de seguridad con línea de vida", "T", 1, "unidad", "k",
  "Condensadoras en techo y fachada: es trabajo en altura."),
 ("EPP-11", "Botiquín de primeros auxilios", "V", 1, "unidad", "", ""),
 ("EPP-12", "Conos y cinta de señalización", "V", 1, "juego", "", ""),
]),
("CNS", "Refrigerantes y consumibles del circuito", [
 ("CNS-01", "R-410A", "E", 11, "kg", "c", "El de mayor rotación en splits."),
 ("CNS-02", "R-32", "E", 5, "kg", "cq",
  "Reemplaza al 410A en equipos nuevos. Es A2L inflamable: exige el detector FUG-02."),
 ("CNS-03", "R-22", "E", 5, "kg", "c", "En retirada, pero el parque instalado sigue vivo."),
 ("CNS-04", "R-404A", "E", 5, "kg", "c", "Cámaras y congelación."),
 ("CNS-05", "R-507", "E", 8, "kg", "c", ""),
 ("CNS-06", "R-407C", "E", 8, "kg", "c", ""),
 ("CNS-07", "R-245fa", "E", 2, "kg", "c", ""),
 ("CNS-08", "R-134a", "E", 5, "kg", "c",
  "Visicooler y equipos chicos: el rubro al que se está prospectando."),
 ("CNS-09", "Aceite POE para HFC", "E", 2, "litro", "c", ""),
 ("CNS-10", "Aceite mineral para R-22", "E", 1, "litro", "c", ""),
 ("CNS-11", "Filtros secadores surtidos", "E", 6, "unidad", "c",
  "Se cambia en cada apertura del circuito."),
 ("CNS-12", "Válvulas Schrader y núcleos", "E", 10, "unidad", "c", ""),
]),
("INS", "Materiales de instalación", [
 ("INS-01", "Cañería de cobre tipo L, 1/4 a 5/8", "E", 4, "rollo", "c", ""),
 ("INS-02", "Aislación de cañería", "E", 20, "metro", "c", ""),
 ("INS-03", "Cinta de embalaje de cañería", "E", 5, "rollo", "c", ""),
 ("INS-04", "Canaleta PVC para línea", "E", 10, "metro", "c", ""),
 ("INS-05", "Soportes y ménsulas para condensadora", "E", 4, "juego", "c", ""),
 ("INS-06", "Tarugos, pernos y anclajes", "E", 1, "caja", "c", ""),
 ("INS-07", "Manguera de drenaje y accesorios", "E", 20, "metro", "c", ""),
 ("INS-08", "Silicona y espuma de poliuretano", "E", 4, "unidad", "c", ""),
 ("INS-09", "Bomba de condensado", "E", 1, "unidad", "c",
  "Cuando no hay pendiente para el drenaje, no hay otra salida."),
 ("INS-10", "Abrazaderas y amarras plásticas", "E", 1, "caja", "c", ""),
]),
("MEL", "Materiales eléctricos", [
 ("MEL-01", "Cable eléctrico de 2,5 y 4 mm2", "E", 2, "rollo", "c", ""),
 ("MEL-02", "Automáticos y diferenciales", "E", 4, "unidad", "c", ""),
 ("MEL-03", "Terminales, conectores y huincha aisladora", "E", 1, "caja", "c", ""),
 ("MEL-04", "Caja de paso o tablero chico", "E", 2, "unidad", "c", ""),
 ("MEL-05", "Contactores y relés térmicos de uso común", "E", 4, "unidad", "c", ""),
 ("MEL-06", "Capacitores de marcha y partida surtidos", "E", 8, "unidad", "c",
  "El repuesto que más se cambia y el que más rápido se paga."),
]),
("LIM", "Limpieza y mantención", [
 ("LIM-01", "Hidrolavadora o bomba de presión para serpentines", "E", 1, "unidad", "k",
  "La mantención preventiva es el negocio que se está saliendo a vender: sin bomba el lavado "
  "se hace a mano y se nota."),
 ("LIM-02", "Bolsa de lavado para split muro", "T", 1, "unidad", "k",
  "Lavar dentro del local sin desmontar y sin mojar al cliente."),
 ("LIM-03", "Desengrasante para serpentín", "E", 2, "litro", "c", ""),
 ("LIM-04", "Desinfectante bactericida para evaporador", "E", 2, "litro", "c",
  "En cocina y sala de venta esto se cobra aparte y se agradece."),
 ("LIM-05", "Peine enderezador de aletas", "T", 1, "unidad", "", "(p136)"),
 ("LIM-06", "Brochas, paños y escobillas", "T", 1, "juego", "c", ""),
 ("LIM-07", "Pistola de aire comprimido", "E", 1, "unidad", "", ""),
 ("LIM-08", "Sondas para desatascar drenajes", "T", 1, "juego", "", ""),
]),
("TER", "Terreno y logística", [
 ("TER-01", "Escalera tijera de 7 peldaños", "V", 1, "unidad", "k", ""),
 ("TER-02", "Escalera telescópica de 4 m", "V", 1, "unidad", "", ""),
 ("TER-03", "Alargador de 20 m con tierra", "V", 1, "unidad", "k", ""),
 ("TER-04", "Lámpara de trabajo y frontal", "T", 1, "unidad", "",
  "Los equipos siempre están en el rincón peor iluminado."),
 ("TER-05", "Carro de carga", "E", 1, "unidad", "", ""),
 ("TER-06", "Lona o cubrepiso para proteger el local", "T", 1, "unidad", "",
  "Dejarle el piso sucio a un restaurante cuesta el cliente."),
 ("TER-07", "Caja organizadora para la camioneta", "V", 2, "unidad", "", ""),
]),
("DOC", "Registro y documentación", [
 ("DOC-01", "Teléfono con la app de gestión", "T", 1, "unidad", "", ""),
 ("DOC-02", "Medidor láser de distancia", "T", 1, "unidad", "",
  "Levantar un local en la mitad del tiempo y cotizar el mismo día."),
 ("DOC-03", "Tarjetas de presentación", "T", 100, "unidad", "c", ""),
 ("DOC-04", "Plantilla de informe de cierre", "T", 1, "unidad", "k",
  "El sitio promete trabajo documentado: el informe de cierre es esa promesa."),
]),
]

# Inventario de junio de 2026: código -> (cantidad, marca, valor en pesos)
TENEMOS = {
 "SOL-01": (3, "Harris", 1000000), "SOL-03": (1, "", 100000), "SOL-04": (1, "", 100000),
 "SOL-05": (1, "", 50000), "SOL-06": (1, "", 50000), "SOL-10": (10, "", 100000),
 "NIT-01": (1, "", 100000), "VAC-01": (1, "Dosivac", 200000), "VAC-04": (2, "", 80000),
 "ELE-01": (1, "Fluke", 150000), "ELE-05": (1, "Fluke", 0), "ELE-06": (1, "Fluke", 50000),
 "MAN-18": (1, "", 600000), "MAQ-01": (1, "", 200000), "MAQ-04": (1, "", 25000),
 "CNS-01": (11, "", 190000), "CNS-03": (5, "", 150000), "CNS-04": (2, "", 50000),
 "CNS-05": (8, "", 160000), "CNS-06": (8, "", 160000), "CNS-07": (2, "", 30000),
}

AMBITOS = {"T": "Cada técnico", "E": "Empresa (taller)", "V": "Camioneta"}


def escapar(texto):
    return texto.replace("'", "''")


def comillar(texto):
    return "null" if not texto else "'" + escapar(texto) + "'"


def construir():
    filas, orden = [], 0
    for codigo_cat, nombre_cat, items in CATEGORIAS:
        for cod, nombre, ambito, cant, unidad, banderas, nota in items:
            orden += 10
            filas.append(dict(
                codigo=cod, nombre=nombre, categoria=nombre_cat, cat=codigo_cat,
                ambito=ambito, cantidad=cant, unidad=unidad, banderas=banderas,
                critico="k" in banderas, consumible="c" in banderas,
                cotizado="q" in banderas, nota=nota, orden=orden,
                tenemos=TENEMOS.get(cod),
            ))
    return filas


def escribir_sql(filas, destino):
    lineas = [
        "-- ════════════════════════════════════════════════════════════════════════════\n"
        "--  Catálogo de dotación — generado por herramientas/catalogo.py\n"
        "--  No editar a mano: se regenera. Ejecutar después de\n"
        "--  migracion-03-inventario.sql.\n"
        "-- ════════════════════════════════════════════════════════════════════════════"
    ]
    for f in filas:
        lineas.append(
            "insert into catalogo_insumos (codigo, nombre, categoria, ambito, unidad,\n"
            "  cantidad_objetivo, critico, consumible, nota, orden) values (\n"
            "  '{codigo}', '{nombre}', '{categoria}', '{ambito}', '{unidad}',\n"
            "  {cantidad}, {critico}, {consumible}, {nota}, {orden})\n"
            "on conflict (codigo) do update set\n"
            "  nombre = excluded.nombre, categoria = excluded.categoria,\n"
            "  ambito = excluded.ambito, unidad = excluded.unidad,\n"
            "  cantidad_objetivo = excluded.cantidad_objetivo, critico = excluded.critico,\n"
            "  consumible = excluded.consumible, nota = excluded.nota,\n"
            "  orden = excluded.orden;".format(
                codigo=f["codigo"], nombre=escapar(f["nombre"]),
                categoria=escapar(f["categoria"]), ambito=f["ambito"], unidad=f["unidad"],
                cantidad=f["cantidad"], critico=str(f["critico"]).lower(),
                consumible=str(f["consumible"]).lower(), nota=comillar(f["nota"]),
                orden=f["orden"],
            )
        )
    lineas.append(
        "-- ─── El inventario de junio de 2026 ─────────────────────────────────────────\n"
        "--  Entra sin dueño: la planilla nunca dijo de quién era cada herramienta.\n"
        "--  Asignarlas a un técnico se hace desde la app, ítem por ítem."
    )
    for f in filas:
        if not f["tenemos"]:
            continue
        cantidad, marca, valor = f["tenemos"]
        lineas.append(
            "insert into existencias (insumo_id, tecnico_id, estado, cantidad, marca, valor, nota)\n"
            "select c.id, null, 'tiene', {cantidad}, {marca}, {valor},\n"
            "       'Levantado del inventario de junio de 2026.'\n"
            "  from catalogo_insumos c where c.codigo = '{codigo}'\n"
            "on conflict do nothing;".format(
                cantidad=cantidad, marca=comillar(marca),
                valor=valor if valor else "null", codigo=f["codigo"],
            )
        )
    io.open(destino, "w", encoding="utf-8", newline="\n").write("\n\n".join(lineas) + "\n")


def escribir_hoja(filas, destino):
    tengo = [f for f in filas if f["tenemos"]]
    criticos = [f for f in filas if f["critico"] and not f["tenemos"]]
    porcentaje = round(100 * len(tengo) / len(filas))
    md = [
        "# Dotación de herramientas, instrumentos y materiales",
        "",
        "**Calor y Frío Industrial SpA** · levantado el 6 de octubre de 2026",
        "",
        "Qué debe tener la empresa para hacer climatización, refrigeración y ventilación, y qué",
        "tiene hoy. La columna **Ámbito** dice de quién es cada cosa: lo que dice «Cada técnico»",
        "se repite por persona, porque dos personas no pueden compartir un juego de herramientas",
        "si salen a trabajos distintos el mismo día.",
        "",
        "Las referencias entre paréntesis apuntan a las páginas del curso **Buenas Prácticas en",
        "Refrigeración y Climatización** (Unidad Ozono, Ministerio del Medio Ambiente, 2018),",
        "guardado en `09 Conocimiento Técnico/Normativa y Buenas Prácticas`.",
        "",
        "Esta hoja se genera desde `cyf-gestion/herramientas/catalogo.py`. La lista viva, con el",
        "estado de cada ítem por técnico, está en la app de gestión.",
        "",
        "## Resumen",
        "",
        "| | |",
        "|---|---|",
        "| Ítems en el catálogo | {} en {} categorías |".format(len(filas), len(CATEGORIAS)),
        "| Se tenían en junio de 2026 | {} ({} %), valorizados en $3.895.000 |".format(
            len(tengo), porcentaje),
        "| Críticos | {} · de ellos **faltan {}** |".format(
            len([f for f in filas if f["critico"]]), len(criticos)),
        "| Ya estaban cotizados en junio | {} |".format(
            len([f for f in filas if f["cotizado"]])),
        "",
        "> **Cómo leer la columna «Estado».** La planilla de junio de 2026 era una lista de",
        "> bienes valorizados —equipos y cilindros con precio— y no un inventario de caja de",
        "> herramientas. Que un alicate aparezca como «falta» significa que **no está",
        "> registrado**, no necesariamente que no exista en el taller. Confirmar ítem por ítem",
        "> es justamente lo que hay que hacer una vez, en la app, y después ya queda al día.",
        "",
        "## Lo que falta y no puede seguir faltando",
        "",
        "En orden de urgencia: primero lo que impide trabajar dentro de norma, después lo que",
        "impide dar un servicio que se pueda cobrar bien.",
        "",
    ]
    for f in criticos:
        nota = f["nota"] or "Ámbito: {}.".format(AMBITOS[f["ambito"]].lower())
        md.append("- **{} · {}** — {}".format(f["codigo"], f["nombre"], nota))
    md += ["", "## Catálogo completo", ""]
    for codigo_cat, nombre_cat, items in CATEGORIAS:
        md += ["### {} · {}".format(codigo_cat, nombre_cat), "",
               "| Código | Ítem | Ámbito | Cantidad | Estado | Por qué |",
               "|---|---|---|---:|---|---|"]
        for cod, nombre, ambito, cant, unidad, banderas, nota in items:
            f = next(x for x in filas if x["codigo"] == cod)
            if f["tenemos"]:
                n, marca, _ = f["tenemos"]
                estado = "tiene {}".format(n) + (" · {}".format(marca) if marca else "")
            else:
                estado = "**falta**"
            sellos = []
            if "k" in banderas:
                sellos.append("crítico")
            if "c" in banderas:
                sellos.append("consumible")
            if "q" in banderas:
                sellos.append("cotizado jun-26")
            sello = " _({})_".format(", ".join(sellos)) if sellos else ""
            md.append("| {} | {}{} | {} | {} {} | {} | {} |".format(
                cod, nombre, sello, AMBITOS[ambito], cant, unidad, estado, nota))
        md.append("")
    md += [
        "## Dos cosas por verificar del inventario de junio",
        "",
        "1. **«Velocitor AM50» (CPS, $250.000)** — no aparece en los catálogos de CPS Products",
        "   como recuperadora de refrigerante. Por el nombre parece un medidor de velocidad de",
        "   aire. Hay que mirar la placa: si resultara ser una recuperadora, cambia la",
        "   conclusión más importante de esta hoja.",
        "2. **El segundo taladro** quedó sin código hasta saber si es de banco, de columna o a",
        "   batería.",
        "",
    ]
    io.open(destino, "w", encoding="utf-8", newline="\n").write("\n".join(md) + "\n")


def main():
    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    filas = construir()
    sql = os.path.join(raiz, "supabase", "seed-dotacion.sql")
    hoja = os.path.join(raiz, "herramientas", "Dotacion.md")
    escribir_sql(filas, sql)
    escribir_hoja(filas, hoja)
    criticos = [f for f in filas if f["critico"] and not f["tenemos"]]
    print("  {} ítems · {} se tienen · {} críticos faltando".format(
        len(filas), len([f for f in filas if f["tenemos"]]), len(criticos)))
    print("  " + sql)
    print("  " + hoja)


if __name__ == "__main__":
    main()
