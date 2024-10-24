import os
import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np
import shutil
from concurrent.futures import ProcessPoolExecutor

input_folder = './datasets/wav/wav_chill'
output_folder = './datasets/spectograms'
n_fft_values = [256, 512, 1024, 2048, 4096, 8192]

def generate_spectrograms(input_file):
    y, sr = librosa.load(input_file, sr=None)
    base_filename = os.path.splitext(os.path.basename(input_file))[0]

    song_output_dir = os.path.join(output_folder, base_filename)
    if not os.path.exists(song_output_dir):
        os.makedirs(song_output_dir)

    for n_fft in n_fft_values:
        # Standard Spectrogram
        D = librosa.amplitude_to_db(np.abs(librosa.stft(y, n_fft=n_fft)), ref=np.max)
        plt.figure(figsize=(10, 4))
        librosa.display.specshow(D, sr=sr, x_axis='time', y_axis='log', cmap='coolwarm')
        plt.title(f'Standard Spectrogram (n_fft={n_fft})')
        plt.colorbar(format='%+2.0f dB')
        plt.savefig(os.path.join(song_output_dir, f'{base_filename}_standard_nfft{n_fft}.png'))
        plt.close()

        # Mel Spectrogram
        mel_spectrogram = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=n_fft)
        mel_db = librosa.amplitude_to_db(mel_spectrogram, ref=np.max)
        plt.figure(figsize=(10, 4))
        librosa.display.specshow(mel_db, sr=sr, x_axis='time', y_axis='mel', cmap='coolwarm')
        plt.title(f'Mel Spectrogram (n_fft={n_fft})')
        plt.colorbar(format='%+2.0f dB')
        plt.savefig(os.path.join(song_output_dir, f'{base_filename}_mel_nfft{n_fft}.png'))
        plt.close()

        # Log-Mel Spectrogram
        log_mel_spectrogram = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=n_fft, power=2.0)
        log_mel_db = librosa.amplitude_to_db(log_mel_spectrogram, ref=np.max)
        plt.figure(figsize=(10, 4))
        librosa.display.specshow(log_mel_db, sr=sr, x_axis='time', y_axis='mel', cmap='coolwarm')
        plt.title(f'Log-Mel Spectrogram (n_fft={n_fft})')
        plt.colorbar(format='%+2.0f dB')
        plt.savefig(os.path.join(song_output_dir, f'{base_filename}_logmel_nfft{n_fft}.png'))
        plt.close()

        # Peak Frequency Spectrogram
        D_peak = np.argmax(np.abs(librosa.stft(y=y, n_fft=n_fft)), axis=0)
        plt.figure(figsize=(10, 4))
        plt.plot(librosa.times_like(D_peak, sr=sr), D_peak)
        plt.title(f'Peak Frequencies Over Time (n_fft={n_fft})')
        plt.xlabel('Time (s)')
        plt.ylabel('Frequency Bin')
        plt.savefig(os.path.join(song_output_dir, f'{base_filename}_peak_nfft{n_fft}.png'))
        plt.close()

    # Move the original WAV file to the song folder in the spectrograms subgenre folder
    shutil.move(input_file, os.path.join(song_output_dir, os.path.basename(input_file)))
    print(f'Processed and moved {input_file} to {song_output_dir}')

# Get list of WAV files in the input directory
wav_files = [os.path.join(input_folder, f) for f in os.listdir(input_folder) if f.endswith('.wav')]

# Use ProcessPoolExecutor to process files in parallel
with ProcessPoolExecutor() as executor:
    executor.map(generate_spectrograms, wav_files)
