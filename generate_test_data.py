import csv
import random
import os

random.seed(42)

equipos = [
    ('Los Leones FC', 'Juan Carlos Pérez', 'juancarlos.perez@email.com', 'DL-10011990-01'),
    ('Rayo de Luna', 'María Fernanda Gómez', 'mfernanda.gomez@email.com', 'DL-10011991-02'),
    ('Estrella Braves', 'Carlos Andrés Ruiz', 'carlos.ruiz@email.com', 'DL-10011988-03'),
    ('Águilas Doradas', 'Sandra Milena López', 'sandra.lopez@email.com', 'DL-10011992-04'),
    ('Cloud 9 FC', 'Pedro Antonio Martínez', 'pedro.martinez@email.com', 'DL-10011987-05'),
    ('Atlético Sur', 'Felipe Eduardo Díaz', 'felipe.diaz@email.com', 'DL-10011993-06'),
    ('Thunder FC', 'Valentina Mejía', 'valentina.mejia@email.com', 'DL-10011994-07'),
    ('Elite FC', 'Diego Fernando Torres', 'diego.torres@email.com', 'DL-10011989-08'),
    ('Norte Sur CA', 'Marta Elena Uribe', 'marta.uribe@email.com', 'DL-10011995-09'),
    ('CD Monarcas', 'Roberto Ignacio Velásquez', 'roberto.velasquez@email.com', 'DL-10011996-10'),
]

nombres = ['Santiago','Juan','Andrés','Mateo','Carlos','Daniel','Sebastián','Felipe','Gabriel','Emmanuel','Paula','Valentina','Miguel','Diego','Jorge','Fernando','José','Ricardo','Oscar','Roberto','Eduardo','Manuel','Alvaro','Cesar','Dario','Brayan','Deimer','Harold','Mario','Leonel','Wilson','Jairo','Luis','Cristiano','Jhonatan','Francisco','Jorge Luis','Miguel Angel','Edgar','Andres Felipe','Sebastian','Pablo','Samuel','Thiago','Juan Diego','Andres Felipe','Juan Sebastian','David Andres']
apellidos = ['Perez','Lopez','Gomez','Ruiz','Hernandez','Martinez','Torres','Ramirez','Diaz','Munoz','Sanchez','Mejia','Castro','Mendez','Vasquez','Suarez','Quintero','Bayona','Rios','Acosta','Correa','Pereira','Nunez','Mesa','Parra','Medina','Garzon','Vega','Lemoine','Molano','Monge','Robles','Restrepo','Gil','Herrera','Gutierrez','Acevedo','Navas','Pizarro','Agudelo','Leon','Novoa','Salas','Sequera','Florez','Molina','Perea','Reyes','Castano','Velasquez']
posiciones = ['ARQUERO','DEFENSOR','MEDIOCAMPISTA','DELANTERO']
piernas = ['DERECHA','IZQUIERDA','AMBIDESTRO']
sangres = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
eps_list = ['Sura','Sanitas','Nueva EPS','Compensar','Dupont']

os.makedirs('docs', exist_ok=True)
csv_path = 'docs/datos_jugadores_10_equipos.csv'

with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
    w = None
    for idx, (eq_name, del_nombre, del_email, del_doc) in enumerate(equipos, 1):
        w = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        w.writerow([f'EQUIPO,{eq_name}'])
        w.writerow(['NOMBRE','N° CAMISETA','DOCUMENTO','POSICION','FECHA NACIMIENTO','TELEFONO','PIERNA HABIL','ALTURA CM','TIPO SANGRE','EPS','CONTACTO EMERGENCIA','ALERGIAS'])
        for j in range(1, 16):
            nombre = f'{nombres[j % len(nombres)]} {apellidos[j % len(apellidos)]}'
            doc = 8872000 + idx*1000 + j
            year = random.randint(1997, 2003)
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            fecha = f'{year:04d}-{month:02d}-{day:02d}'
            tel = 3100000000 + idx*1000000 + j*100
            pierna = piernas[j % len(piernas)]
            alt = random.choice([165,170,172,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190])
            sang = sangres[j % len(sangres)]
            eps = eps_list[j % len(eps_list)]
            cont_nom = nombres[(j+idx) % len(nombres)]
            cont_ape = apellidos[(j+idx) % len(apellidos)]
            cont_tel = 3100000000 + idx*1000000 + j*100 + 1
            contacto = f'{cont_nom} {cont_ape} - {cont_tel}'
            alergias = 'Ninguna'
            w.writerow([nombre, j, doc, posiciones[j % len(posiciones)], fecha, tel, pierna, alt, sang, eps, contacto, alergias])

print(f'CSV creado exitosamente: {csv_path}')
print(f'Total de equipos: {len(equipos)}')
print(f'Total de jugadores: {len(equipos)*15}')
