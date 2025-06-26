
from moviepy.editor import *
import numpy as np

# Caminho da imagem
image_path = "dcode_logo.jpeg"
duration = 6

# Cria clipe da imagem com rotação
image_clip = ImageClip(image_path).set_duration(duration).resize(height=800).set_position("center")

def animate_rotation(get_frame, t):
    angle = 12 * np.sin(2 * np.pi * t / duration)
    return ImageClip(image_path).rotate(angle, resample='bicubic').resize(height=800).get_frame(t)

animated_clip = VideoClip(lambda t: animate_rotation(image_clip.get_frame, t), duration=duration).set_position("center")

# Fundo preto
background = ColorClip(size=(1080, 1080), color=(0, 0, 0), duration=duration)
final_clip = CompositeVideoClip([background, animated_clip])

# Exporta
final_clip.write_videofile("dcode_stock_intro_video.mp4", fps=24)
